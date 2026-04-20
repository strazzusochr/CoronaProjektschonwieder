import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function normalizeBridgeBase(candidate) {
  const cleaned = String(candidate ?? '').trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  return cleaned.endsWith('/health') ? cleaned.slice(0, -'/health'.length) : cleaned;
}

async function probeBridgeBase(base, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(800, Math.min(timeoutMs, 3500)));
  try {
    const response = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return {
      ok: response.status === 200,
      status: response.status,
      error: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 0,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForBridgeReady(bases, timeoutMs, attempts = 10, delayMs = 450) {
  const probeAttempts = [];
  for (let i = 0; i < attempts; i += 1) {
    for (const base of bases) {
      const checked = await probeBridgeBase(base, timeoutMs);
      probeAttempts.push({
        at: nowIso(),
        base,
        status: checked.status,
        error: checked.error,
      });
      if (checked.ok) {
        return {
          ready: true,
          base,
          attempts: probeAttempts,
        };
      }
    }
    if (i < attempts - 1) await sleep(delayMs);
  }
  return {
    ready: false,
    base: '',
    attempts: probeAttempts,
  };
}

async function ensureDevtoolsBridge(timeoutMs) {
  const configuredBase = normalizeBridgeBase(
    process.env.DEVTOOLS_BRIDGE_BASE_URL ?? process.env.DEVTOOLS_BRIDGE_URL ?? '',
  );
  const bridgePort = String(process.env.DEVTOOLS_BRIDGE_PORT ?? '3911').trim() || '3911';
  const candidateBases = Array.from(
    new Set(
      [configuredBase, `http://127.0.0.1:${bridgePort}`, `http://localhost:${bridgePort}`].filter(
        (entry) => String(entry).trim().length > 0,
      ),
    ),
  );

  const initialCheck = await waitForBridgeReady(candidateBases, timeoutMs, 3, 250);
  if (initialCheck.ready) {
    return {
      ready: true,
      started: false,
      base: initialCheck.base,
      attempts: initialCheck.attempts,
      launcher: '',
    };
  }

  const repoRoot = resolve(process.cwd(), '..');
  const bridgeScript = resolve(repoRoot, 'core_tools_bridge.py');
  if (!existsSync(bridgeScript)) {
    return {
      ready: false,
      started: false,
      base: '',
      attempts: initialCheck.attempts,
      launcher: '',
      error: `Bridge script missing: ${bridgeScript}`,
    };
  }

  const launchers = [];
  const customPython = String(process.env.PYTHON ?? '').trim();
  if (customPython) launchers.push({ cmd: customPython, args: [] });
  launchers.push({ cmd: 'python', args: [] }, { cmd: 'py', args: ['-3'] });

  const launchAttempts = [];
  for (const launcher of launchers) {
    try {
      const child = spawn(launcher.cmd, [...launcher.args, bridgeScript], {
        cwd: repoRoot,
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          DEVTOOLS_BRIDGE_HOST: String(process.env.DEVTOOLS_BRIDGE_HOST ?? '127.0.0.1'),
          DEVTOOLS_BRIDGE_PORT: bridgePort,
        },
      });
      child.unref();

      const postStart = await waitForBridgeReady(candidateBases, timeoutMs, 12, 400);
      launchAttempts.push({
        launcher: `${launcher.cmd} ${launcher.args.join(' ')}`.trim(),
        ready: postStart.ready,
        base: postStart.base,
      });
      if (postStart.ready) {
        return {
          ready: true,
          started: true,
          base: postStart.base,
          attempts: [...initialCheck.attempts, ...postStart.attempts],
          launcher: `${launcher.cmd} ${launcher.args.join(' ')}`.trim(),
          launch_attempts: launchAttempts,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      launchAttempts.push({
        launcher: `${launcher.cmd} ${launcher.args.join(' ')}`.trim(),
        ready: false,
        error: message,
      });
    }
  }

  return {
    ready: false,
    started: false,
    base: '',
    attempts: initialCheck.attempts,
    launcher: '',
    launch_attempts: launchAttempts,
    error: 'Unable to start DevTools bridge with available Python launchers.',
  };
}

function parseArgs(argv) {
  const options = {
    hub: '',
    hubProvided: false,
    samples: 30,
    intervalMs: 700,
    timeoutMs: 20000,
    out: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--hub' && next) {
      options.hub = next.trim().replace(/\/+$/, '');
      options.hubProvided = true;
      i += 1;
      continue;
    }
    if (arg === '--samples' && next) {
      options.samples = Math.max(1, Number.parseInt(next, 10) || 30);
      i += 1;
      continue;
    }
    if (arg === '--interval' && next) {
      options.intervalMs = Math.max(100, Number.parseInt(next, 10) || 700);
      i += 1;
      continue;
    }
    if (arg === '--timeout' && next) {
      options.timeoutMs = Math.max(1000, Number.parseInt(next, 10) || 10000);
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.out = next.trim();
      i += 1;
    }
  }

  return options;
}

function isTransientProbeError(message) {
  const normalized = String(message ?? '').toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('aborted') ||
    normalized.includes('timeout') ||
    normalized.includes('econnreset') ||
    normalized.includes('socket hang up')
  );
}

function candidateHubs(args) {
  const envHub = (process.env.PLATFORM7_HUB_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const bases = args.hubProvided
    ? [args.hub]
    : [args.hub, envHub, 'http://127.0.0.1:3902', 'http://127.0.0.1:3901'];
  return Array.from(
    new Set(
      bases
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

async function resolveHubBase(candidates, timeoutMs) {
  const attempts = [];
  for (const base of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 4500));
    try {
      const response = await fetch(`${base}/platform7/contract`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (response.status !== 200) {
        attempts.push(`${base} => HTTP ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const status = String(payload?.status ?? '');
      const roles = Array.isArray(payload?.contract?.roles) ? payload.contract.roles : [];
      if ((status === 'ok' || status === 'blocked') && roles.length >= 29) {
        attempts.push(`${base} => ok (${status}, roles=${roles.length})`);
        return { hub: base, attempts };
      }
      attempts.push(`${base} => invalid-contract (status=${status || 'empty'}, roles=${roles.length})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push(`${base} => ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`No reachable hub candidate: ${attempts.join(' | ')}`);
}

function countTransitions(values) {
  let transitions = 0;
  let previous = null;
  for (const value of values) {
    if (previous !== null && previous !== value) transitions += 1;
    previous = value;
  }
  return transitions;
}

async function probeOnce(hub, timeoutMs) {
  const startedAt = nowIso();
  const attempts = 2;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs + (attempt - 1) * 5000);
    try {
      const response = await fetch(`${hub}/control-center/state?fresh=1`, {
        method: 'GET',
        signal: controller.signal,
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      const bootstrap = payload && typeof payload.bootstrap === 'object' ? payload.bootstrap : {};
      const probes = payload && typeof payload.service_probes === 'object' ? payload.service_probes : {};
      const bridgeProbe = probes && typeof probes['devtools-bridge'] === 'object' ? probes['devtools-bridge'] : {};
      const bridgeStatus = Number(bridgeProbe?.effective_http_status ?? bridgeProbe?.http_status ?? 0);
      return {
        t: startedAt,
        ok: response.ok,
        http_status: response.status,
        run_status: String(payload?.latest_run?.status ?? ''),
        bootstrap: String(bootstrap?.status ?? ''),
        ready: Boolean(payload?.ready_for_prompt_execute),
        bridge_http: bridgeStatus,
        service_probes: Object.fromEntries(
          Object.entries(probes).map(([key, value]) => [key, Number(value?.effective_http_status ?? value?.http_status ?? 0)]),
        ),
        error: '',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable = attempt < attempts && isTransientProbeError(message);
      if (isRetryable) {
        await sleep(250);
        continue;
      }
      return {
        t: startedAt,
        ok: false,
        http_status: 0,
        run_status: '',
        bootstrap: '',
        ready: false,
        bridge_http: 0,
        service_probes: {},
        error: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    t: startedAt,
    ok: false,
    http_status: 0,
    run_status: '',
    bootstrap: '',
    ready: false,
    bridge_http: 0,
    service_probes: {},
    error: 'state-probe-exhausted',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bridgeBootstrap = await ensureDevtoolsBridge(args.timeoutMs);
  const hubCandidates = candidateHubs(args);
  const resolvedHub = await resolveHubBase(hubCandidates, args.timeoutMs);
  const dateStamp = nowIso().slice(0, 10);
  const outputPath = resolve(
    process.cwd(),
    args.out || `../proofs/platform7_state_probe_${dateStamp}_autonomous.json`,
  );

  const observations = [];
  for (let i = 0; i < args.samples; i += 1) {
    observations.push(await probeOnce(resolvedHub.hub, args.timeoutMs));
    if (i < args.samples - 1) await sleep(args.intervalMs);
  }

  const errors = observations.filter((entry) => !entry.ok).length;
  const bridgeValues = observations.map((entry) => entry.bridge_http);
  const bridgeUpSamples = observations.filter((entry) => entry.bridge_http === 200).length;
  const readyValues = observations.map((entry) => entry.ready);
  const runStatusValues = observations.map((entry) => entry.run_status || 'unknown');
  const bootstrapValues = observations.map((entry) => entry.bootstrap || 'unknown');
  const bridgeHttpFlaps = countTransitions(bridgeValues);
  const passConditions = {
    no_errors: errors === 0,
    bridge_stable: bridgeHttpFlaps === 0,
    bridge_up_all_samples: bridgeUpSamples === observations.length,
    bridge_bootstrap_ready: bridgeBootstrap.ready === true,
  };
  const pass = Object.values(passConditions).every(Boolean);

  const summary = {
    timestamp: nowIso(),
    bridge_bootstrap: bridgeBootstrap,
    hub: resolvedHub.hub,
    hub_candidates: hubCandidates,
    hub_resolution_attempts: resolvedHub.attempts,
    samples: args.samples,
    interval_ms: args.intervalMs,
    timeout_ms: args.timeoutMs,
    errors,
    bridge_http_flaps: bridgeHttpFlaps,
    bridge_up_samples: bridgeUpSamples,
    bridge_down_samples: observations.length - bridgeUpSamples,
    ready_transitions: countTransitions(readyValues),
    run_status_transitions: countTransitions(runStatusValues),
    bootstrap_transitions: countTransitions(bootstrapValues),
    pass_conditions: passConditions,
    pass,
    observations,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(`WROTE ${outputPath}`);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.pass) process.exitCode = 2;
}

await main();
