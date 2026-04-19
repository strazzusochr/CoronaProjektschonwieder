import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testResultsDir = path.join(root, 'test-results');
const lockDir = path.join(testResultsDir, '.browser-test.lock');
const timeoutSeconds = Number.parseInt(process.env.BROWSER_TEST_LOCK_TIMEOUT_SECONDS ?? '900', 10);
const staleSeconds = Number.parseInt(process.env.BROWSER_TEST_LOCK_STALE_SECONDS ?? '1800', 10);
const pollMs = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeLockIfOwned() {
  try {
    const ownerPath = path.join(lockDir, 'owner.json');
    const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
    if (owner.pid === process.pid) {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  } catch {
    // Best effort cleanup only.
  }
}

async function acquireLock() {
  fs.mkdirSync(testResultsDir, { recursive: true });
  const deadline = Date.now() + timeoutSeconds * 1000;

  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(
        path.join(lockDir, 'owner.json'),
        JSON.stringify(
          {
            pid: process.pid,
            startedAt: new Date().toISOString(),
            command: ['playwright', 'test', ...process.argv.slice(2)],
          },
          null,
          2,
        ),
        'utf8',
      );
      return;
    } catch (error) {
      if (error.code === 'ENOENT') {
        fs.mkdirSync(testResultsDir, { recursive: true });
        await sleep(100);
        continue;
      }

      if (error.code !== 'EEXIST') {
        throw error;
      }

      try {
        const stats = fs.statSync(lockDir);
        const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
        if (ageSeconds > staleSeconds) {
          fs.rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }

      await sleep(pollMs);
    }
  }

  throw new Error(`Timed out waiting for browser test lock after ${timeoutSeconds}s: ${lockDir}`);
}

function runPlaywright() {
  const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
  const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  return new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function shouldEnsureLiveBridge() {
  const grepIndex = process.argv.findIndex((entry) => entry === '--grep');
  if (grepIndex === -1) return false;
  const grepValue = process.argv[grepIndex + 1] ?? '';
  return grepValue.includes('@live');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(host, port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reachable = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(ok);
      };
      socket.setTimeout(1200);
      socket.on('connect', () => done(true));
      socket.on('timeout', () => done(false));
      socket.on('error', () => done(false));
    });
    if (reachable) return true;
    await wait(400);
  }
  return false;
}

async function ensureLiveBridgeIfNeeded() {
  if (!shouldEnsureLiveBridge()) return null;

  const host = process.env.DEVTOOLS_BRIDGE_HOST ?? '127.0.0.1';
  const port = Number.parseInt(process.env.DEVTOOLS_BRIDGE_PORT ?? '3911', 10);
  if (Number.isFinite(port) && (await waitForPort(host, port, 2000))) return null;

  const bridgeScript = path.resolve(root, '..', 'core_tools_bridge.py');
  if (!fs.existsSync(bridgeScript)) {
    throw new Error(`Live bridge script not found: ${bridgeScript}`);
  }

  const bridgeCmd = process.platform === 'win32' ? 'py' : 'python3';
  const bridgeArgs = process.platform === 'win32' ? ['-3', bridgeScript] : [bridgeScript];
  const bridge = spawn(bridgeCmd, bridgeArgs, {
    cwd: path.resolve(root, '..'),
    stdio: 'ignore',
    shell: false,
  });

  const ready = await waitForPort(host, port, 20000);
  if (!ready) {
    try {
      bridge.kill('SIGTERM');
    } catch {
      // best effort only
    }
    throw new Error(`DevTools bridge did not become ready on ${host}:${port}`);
  }
  return bridge;
}

function stopBridge(processHandle) {
  if (!processHandle) return;
  if (processHandle.exitCode !== null) return;
  try {
    processHandle.kill('SIGTERM');
  } catch {
    // best effort only
  }
}

let bridgeHandle = null;

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stopBridge(bridgeHandle);
    removeLockIfOwned();
    process.exit(130);
  });
}

try {
  await acquireLock();
  bridgeHandle = await ensureLiveBridgeIfNeeded();
  const exitCode = await runPlaywright();
  stopBridge(bridgeHandle);
  bridgeHandle = null;
  removeLockIfOwned();
  process.exit(exitCode);
} catch (error) {
  stopBridge(bridgeHandle);
  bridgeHandle = null;
  removeLockIfOwned();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
