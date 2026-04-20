import { type APIRequestContext, expect, test } from '@playwright/test';
import {
  attachRuntimeIssueCollector,
  attachScreenshotEvidence,
  expectNoHorizontalOverflow,
  expectNoRuntimeIssues,
  gotoApp,
} from './browser-gates';

const ENV_HUB_BASE = process.env.PLATFORM7_HUB_BASE_URL;
const HUB_BASE_CANDIDATES = Array.from(
  new Set(
    [
      ENV_HUB_BASE,
      'http://127.0.0.1:3902',
      'http://127.0.0.1:3901',
    ].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0),
  ),
);
const SESSION_ID = `live-${Date.now()}`;
const LIVE_HUB_PROBE_TIMEOUT_MS = Number.parseInt(process.env.LIVE_HUB_PROBE_TIMEOUT_MS ?? '12000', 10);

async function waitForHttp200(
  fn: () => Promise<{ status: number; body: string }>,
  label: string,
  retries = 6,
  delayMs = 1200,
) {
  const attempts: string[] = [];
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const result = await fn();
      attempts.push(`${attempt}: HTTP ${result.status}`);
      if (result.status === 200) return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      attempts.push(`${attempt}: ${detail}`);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label} readiness failed. Attempts: ${attempts.join(' | ')}`);
}

type HubProbeResult = {
  ok: boolean;
  detail: string;
};

async function probeContractEndpoint(
  request: APIRequestContext,
  base: string,
  timeoutMs = LIVE_HUB_PROBE_TIMEOUT_MS,
): Promise<HubProbeResult> {
  try {
    const response = await request.get(`${base}/platform7/contract`, {
      timeout: timeoutMs,
      failOnStatusCode: false,
    });
    if (response.status() !== 200) {
      return { ok: false, detail: `HTTP ${response.status()}` };
    }

    const raw = await response.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ok: false, detail: 'invalid-json' };
    }

    const status = String(body.status ?? '');
    const contract =
      body.contract && typeof body.contract === 'object'
        ? (body.contract as Record<string, unknown>)
        : {};
    const roles = Array.isArray(contract.roles) ? contract.roles : [];
    const statusAllowed = status === 'ok' || status === 'blocked';
    if (!(statusAllowed && roles.length >= 29)) {
      return { ok: false, detail: `status=${status || 'empty'} roles=${roles.length}` };
    }

    // A reachable contract is not enough for live run-control gates.
    // Require a hub that is ready to accept /runs (prevents choosing a blocked fallback instance).
    const stateResponse = await request.get(`${base}/control-center/state?fresh=1`, {
      timeout: timeoutMs,
      failOnStatusCode: false,
    });
    if (stateResponse.status() !== 200) {
      return { ok: false, detail: `status=${status} roles=${roles.length} state_http=${stateResponse.status()}` };
    }
    const stateRaw = await stateResponse.text();
    let stateBody: Record<string, unknown>;
    try {
      stateBody = JSON.parse(stateRaw) as Record<string, unknown>;
    } catch {
      return { ok: false, detail: `status=${status} roles=${roles.length} state=invalid-json` };
    }
    const readyForPromptExecute = Boolean(stateBody.ready_for_prompt_execute);
    if (readyForPromptExecute) {
      return { ok: true, detail: `status=${status} roles=${roles.length} ready=true` };
    }
    return { ok: false, detail: `status=${status} roles=${roles.length} ready=false` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, detail };
  }
}

async function resolveLiveHubBase(
  request: APIRequestContext,
  retries = 10,
  delayMs = 1500,
): Promise<string> {
  const attempts: string[] = [];
  for (let cycle = 1; cycle <= retries; cycle += 1) {
    for (const base of HUB_BASE_CANDIDATES) {
      const probe = await probeContractEndpoint(request, base);
      attempts.push(`[${cycle}] ${base} -> ${probe.detail}`);
      if (probe.ok) {
        return base;
      }
    }
    if (cycle < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(
    `No reachable live hub with /platform7/contract from candidates: ${HUB_BASE_CANDIDATES.join(', ')}. Attempts: ${attempts.join(' | ')}`,
  );
}

async function assertContractTruth(request: APIRequestContext, hubBase: string) {
  const response = await request.get(`${hubBase}/platform7/contract`);
  expect(response.status(), 'Platform7 contract status').toBe(200);
  const payload = (await response.json()) as Record<string, unknown>;
  const contract =
    payload.contract && typeof payload.contract === 'object'
      ? (payload.contract as Record<string, unknown>)
      : {};
  const roles = Array.isArray(contract.roles) ? (contract.roles as Record<string, unknown>[]) : [];
  const workers = roles.filter((role) => String(role.kind ?? '') === 'worker').length;
  const supervisors = roles.filter((role) => String(role.kind ?? '') === 'supervisor').length;
  const namespaces = new Set(roles.map((role) => String(role.namespace ?? '')));

  expect(roles.length, 'Platform7 visible role count').toBe(29);
  expect(workers, 'Platform7 worker role count').toBe(27);
  expect(supervisors, 'Platform7 supervisor role count').toBe(2);
  expect(namespaces.has('sentinel_truth')).toBeTruthy();
  expect(namespaces.has('sentinel_runtime')).toBeTruthy();
  expect(namespaces.has('local.evidence.curator')).toBeTruthy();
  expect(namespaces.has('local.recovery.marshal')).toBeTruthy();

  const requiredSupervisors = Array.isArray(contract.required_supervisor_namespaces)
    ? (contract.required_supervisor_namespaces as unknown[]).map((entry) => String(entry)).sort()
    : [];
  expect(requiredSupervisors, 'required supervisors').toEqual(['sentinel_runtime', 'sentinel_truth']);
}

async function assertControlCenterStateContract(request: APIRequestContext, hubBase: string) {
  const response = await request.get(`${hubBase}/control-center/state?fresh=1`);
  expect(response.status(), 'control-center state status').toBe(200);
  const payload = (await response.json()) as Record<string, unknown>;
  const timeline = Array.isArray(payload.timeline) ? (payload.timeline as Record<string, unknown>[]) : [];
  const activeExecution =
    payload.active_execution && typeof payload.active_execution === 'object'
      ? (payload.active_execution as Record<string, unknown>)
      : {};

  expect(activeExecution, 'active execution payload exists').toBeTruthy();
  expect(typeof activeExecution.current_state === 'string' || activeExecution.current_state === undefined).toBeTruthy();
  expect(typeof activeExecution.reason === 'string' || activeExecution.reason === undefined).toBeTruthy();
  expect(typeof activeExecution.next_action === 'string' || activeExecution.next_action === undefined).toBeTruthy();

  if (timeline.length > 0) {
    const row = timeline[timeline.length - 1];
    expect(typeof row.current_state === 'string', 'timeline.current_state').toBeTruthy();
    expect(typeof row.previous_state === 'string', 'timeline.previous_state').toBeTruthy();
    expect(typeof row.next_state === 'string', 'timeline.next_state').toBeTruthy();
    expect(typeof row.reason === 'string', 'timeline.reason').toBeTruthy();
    expect(typeof row.next_action === 'string', 'timeline.next_action').toBeTruthy();
    expect(typeof row.trace_id === 'string', 'timeline.trace_id').toBeTruthy();
    expect(typeof row.task_id === 'string', 'timeline.task_id').toBeTruthy();
    expect(typeof row.step_id === 'string', 'timeline.step_id').toBeTruthy();
    expect(typeof row.agent_id === 'string', 'timeline.agent_id').toBeTruthy();
    expect(typeof row.runtime_target === 'string', 'timeline.runtime_target').toBeTruthy();
  }
}

async function assertRunControlTransitions(request: APIRequestContext, hubBase: string) {
  const routingBeforeResponse = await request.get(`${hubBase}/routing/status`);
  expect(routingBeforeResponse.ok(), 'routing status should load before reroute assertions').toBeTruthy();
  const routingBeforePayload = (await routingBeforeResponse.json()) as Record<string, unknown>;
  const beforeOverride =
    routingBeforePayload.override && typeof routingBeforePayload.override === 'object'
      ? (routingBeforePayload.override as Record<string, unknown>)
      : {};
  const beforeModeRaw = String(beforeOverride.mode ?? 'auto').toLowerCase();
  const initialGlobalMode: 'auto' | 'local' | 'remote' =
    beforeModeRaw === 'local' || beforeModeRaw === 'remote' ? beforeModeRaw : 'auto';

  try {
    const startResponse = await request.post(`${hubBase}/runs`, {
      data: {
        goal: 'Live run-control gate for Platform7.',
        profile_id: 'three_d_web_game_swarm',
        source: 'test:browser:live',
        repo: 'https://github.com/strazzusochr/CoronaProjektschonwieder',
        ref: 'main',
        status: 'queued',
        halt_on_fail: false,
      },
    });
    expect(startResponse.ok(), 'Start run for control transition gate').toBeTruthy();
    const startPayload = (await startResponse.json()) as Record<string, unknown>;
    const runId = String(
      startPayload.run_id ??
        ((startPayload.run && typeof startPayload.run === 'object'
          ? (startPayload.run as Record<string, unknown>).run_id
          : '') as string),
    );
    expect(runId.length, 'run id must exist for control transition gate').toBeGreaterThan(0);

    const actions = ['pause', 'resume', 'retry-last-step', 'assign-human', 'rollback'] as const;
    for (const action of actions) {
      const response = await request.post(`${hubBase}/runs/${runId}/${action}`, {
        data: {
          source: 'test:browser:live',
          reason: `control-${action}`,
          session_id: `live-control-${Date.now()}`,
          trace_id: '',
          task_id: '',
          step_id: '',
          agent_id: '',
          role: '',
          runtime_target: '',
        },
      });
      expect(response.ok(), `run control ${action} should succeed`).toBeTruthy();
      const payload = (await response.json()) as Record<string, unknown>;
      expect(String(payload.reason ?? '').length, `run control ${action} reason`).toBeGreaterThan(0);
      expect(String(payload.next_action ?? '').length, `run control ${action} next_action`).toBeGreaterThan(0);
      expect(Boolean(payload.event), `run control ${action} event`).toBeTruthy();
    }

    const reroutePayload = {
      source: 'test:browser:live',
      reason: 'control-reroute',
      session_id: `live-control-${Date.now()}`,
      trace_id: '',
      task_id: '',
      step_id: '',
      agent_id: '',
      role: '',
      runtime_target: '',
    };
    for (const mode of ['local', 'remote'] as const) {
      const response = await request.post(`${hubBase}/runs/${runId}/reroute/${mode}`, { data: reroutePayload });
      expect(response.ok(), `run reroute ${mode} should succeed`).toBeTruthy();
      const payload = (await response.json()) as Record<string, unknown>;
      expect(String(payload.mode ?? ''), `run reroute ${mode} mode`).toBe(mode);
      expect(Boolean(payload.event), `run reroute ${mode} event`).toBeTruthy();
    }

    const routingAfterResponse = await request.get(`${hubBase}/routing/status`);
    expect(routingAfterResponse.ok(), 'routing status should load after run reroutes').toBeTruthy();
    const routingAfterPayload = (await routingAfterResponse.json()) as Record<string, unknown>;
    const afterOverride =
      routingAfterPayload.override && typeof routingAfterPayload.override === 'object'
        ? (routingAfterPayload.override as Record<string, unknown>)
        : {};
    expect(
      String(afterOverride.mode ?? 'auto').toLowerCase(),
      'global routing mode should remain unchanged by run-scoped reroutes',
    ).toBe(initialGlobalMode);

    const evidenceResponse = await request.get(`${hubBase}/runs/${runId}/evidence`);
    expect(evidenceResponse.ok(), 'run evidence should load').toBeTruthy();
    const evidencePayload = (await evidenceResponse.json()) as Record<string, unknown>;
    const summary =
      evidencePayload.summary && typeof evidencePayload.summary === 'object'
        ? (evidencePayload.summary as Record<string, unknown>)
        : {};
    const stepCount = Number(summary.total_steps ?? 0);
    if (stepCount > 0) {
      const quarantineResponse = await request.post(`${hubBase}/runs/${runId}/quarantine`, {
        data: {
          source: 'test:browser:live',
          reason: 'control-quarantine',
          session_id: `live-control-${Date.now()}`,
          trace_id: '',
          task_id: '',
          step_id: '',
          agent_id: '',
          role: '',
          runtime_target: '',
          artifact: '',
        },
      });
      expect(quarantineResponse.ok(), 'run quarantine should succeed when evidence exists').toBeTruthy();
      const quarantinePayload = (await quarantineResponse.json()) as Record<string, unknown>;
      expect(String(quarantinePayload.run_id ?? ''), 'run quarantine run id').toBe(runId);
      expect(Boolean(quarantinePayload.event), 'run quarantine event').toBeTruthy();
    }
  } finally {
    const restoreResponse = await request.post(`${hubBase}/routing/override`, {
      data: {
        mode: initialGlobalMode,
        source: 'test:browser:live',
        reason: 'restore-global-routing-mode',
        session_id: `live-control-${Date.now()}`,
        trace_id: '',
        task_id: '',
        step_id: '',
        agent_id: '',
        role: '',
        runtime_target: '',
      },
    });
    expect(restoreResponse.ok(), 'global routing mode restore should succeed').toBeTruthy();
  }
}

test('@live live gate requires real hub+bridge readiness and synchronized windows', async ({ page, request }, testInfo) => {
  test.setTimeout(240000);
  const hubBase = await resolveLiveHubBase(request);
  await page.addInitScript((hubBase) => {
    window.localStorage.setItem('godmode.hubBaseUrl', hubBase);
    window.localStorage.setItem('godmode.openHandsBaseUrl', 'http://127.0.0.1:3000');
  }, hubBase);

  await waitForHttp200(async () => {
    const response = await request.get(`${hubBase}/health`);
    return { status: response.status(), body: await response.text() };
  }, 'Hub health');

  await waitForHttp200(async () => {
    const response = await request.get(`${hubBase}/control-center/state?fresh=1`);
    const bodyText = await response.text();
    try {
      const body = JSON.parse(bodyText) as Record<string, unknown>;
      const probes = body.service_probes && typeof body.service_probes === 'object' ? (body.service_probes as Record<string, Record<string, unknown>>) : {};
      const bridge = probes['devtools-bridge'];
      const bridgeReady = Number(bridge?.http_status ?? 0) === 200;
      return { status: response.status() === 200 && bridgeReady ? 200 : 503, body: bodyText };
    } catch {
      return { status: 503, body: bodyText };
    }
  }, 'Control-center state + devtools bridge readiness');

  await waitForHttp200(async () => {
    const response = await request.get(`${hubBase}/platform7/contract`);
    return { status: response.status(), body: await response.text() };
  }, 'Platform7 contract');
  await assertContractTruth(request, hubBase);
  await assertControlCenterStateContract(request, hubBase);
  await assertRunControlTransitions(request, hubBase);

  const runtimeCollector = attachRuntimeIssueCollector(page);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const roles = [
    { window: 'commander', heading: 'Commander' },
    { window: 'glasshouse', heading: 'Glasshouse' },
    { window: 'operations', heading: 'Operations' },
  ] as const;

  for (const role of roles) {
    const scope = `live:${role.window}`;
    runtimeCollector.setScope(scope);

    await gotoApp(page, `/?window=${role.window}&session=${SESSION_ID}`);
    const checkpoint = runtimeCollector.mark();
    await expect(page.getByRole('heading', { name: /transparent multi-agent developer platform/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: role.heading, exact: true })).toBeVisible();
    await expect(page.getByText(/sentineltruthagent/i).first()).toBeVisible();
    await expect(page.getByText(/sentinelruntimeagent/i).first()).toBeVisible();

    if (role.window === 'commander') {
      const syncNowButton = page.getByRole('button', { name: /sync now/i });
      const syncingButton = page.getByRole('button', { name: /syncing\.\.\./i });
      if (await syncNowButton.isVisible().catch(() => false)) {
        await syncNowButton.click();
      } else {
        await expect(syncingButton).toBeVisible();
      }
      await expect(page.getByRole('button', { name: /dispatch starten/i }).first()).toBeVisible();
    }
    if (role.window === 'glasshouse') {
      await expect(page.getByRole('heading', { name: 'Control Event Stream', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /retry same target/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /assign to human/i })).toBeVisible();
    }
    if (role.window === 'operations') {
      await expect(page.getByRole('heading', { name: 'Live State Probe', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /run 10-sample probe/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Raw JSON Diagnostics', exact: true })).toBeVisible();
    }

    await expectNoHorizontalOverflow(page, scope);
    await attachScreenshotEvidence(page, testInfo, scope);
    expectNoRuntimeIssues(runtimeCollector.since(checkpoint), scope);
  }
});
