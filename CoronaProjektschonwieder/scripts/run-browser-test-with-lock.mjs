import { spawn } from 'node:child_process';
import fs from 'node:fs';
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

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    removeLockIfOwned();
    process.exit(130);
  });
}

try {
  await acquireLock();
  const exitCode = await runPlaywright();
  removeLockIfOwned();
  process.exit(exitCode);
} catch (error) {
  removeLockIfOwned();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
