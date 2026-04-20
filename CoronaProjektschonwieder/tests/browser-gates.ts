import { existsSync, statSync } from 'node:fs';
import { expect, type Page, type TestInfo } from '@playwright/test';

type RuntimeIssueKind = 'console' | 'pageerror' | 'requestfailed' | 'http';

type RuntimeIssue = {
  kind: RuntimeIssueKind;
  scope: string;
  detail: string;
};

type RuntimeIssueCheckpoint = {
  index: number;
};

type RuntimeIssueCollector = {
  mark: () => RuntimeIssueCheckpoint;
  setScope: (scope: string) => void;
  since: (checkpoint: RuntimeIssueCheckpoint) => RuntimeIssue[];
};

type OverflowingElement = {
  selector: string;
  left: number;
  right: number;
  width: number;
  text: string;
};

type HorizontalOverflowReport = {
  bodyScrollWidth: number;
  rootScrollWidth: number;
  viewportWidth: number;
  overflowingElements: OverflowingElement[];
};

const HUB_ORIGIN = 'http://127.0.0.1:3901';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function runPayload(runId: string, status = 'RUNNING') {
  return {
    run_id: runId,
    trace_id: `trace-${runId}`,
    task_id: `task-${runId}`,
    status,
    goal: 'Browser regression gate validation',
    profile_id: 'three_d_web_game_swarm',
    profile_label: '3D Web Game Swarm',
    current_step: 1,
    current_agent: 'product_scope',
    forwarded_steps: 1,
    partial_steps: 0,
    total_steps: 3,
    evidence_status: status === 'PASS' ? 'Verified' : 'Partial',
    evidence_manifest: `/evidence/manifests/${runId}.json`,
    evidence_manifest_latest: `/evidence/manifests/${runId}_latest.json`,
    steps: [
      {
        step: 1,
        agent: 'product_scope',
        role: 'ProductScopeAgent',
        status: 'forwarded',
        runtime_target: 'langgraph-local',
        trace_id: `trace-${runId}`,
        task_id: `task-${runId}`,
        step_id: `${runId}-step-1`,
        reason: 'Deterministic Playwright fixture for browser gates.',
      },
    ],
  };
}

export async function mockDispatchHubApi(page: Page) {
  await page.route(`${HUB_ORIGIN}/**`, async (route, request) => {
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname === '/control-center/state') {
      await route.fulfill(jsonResponse({
        status: 'ok',
        ready_for_prompt_execute: true,
        bootstrap: { status: 'READY', ready: true, summary: 'Platform ready for browser gate validation.' },
        latest_run: runPayload('run-browser-gate'),
        service_probes: {
          openhands: { http_status: 200 },
          n8n: { http_status: 200 },
          litellm: { http_status: 200 },
          'devtools-bridge': { http_status: 200 },
        },
      }));
      return;
    }

    if (pathname === '/health') {
      await route.fulfill(jsonResponse({
        status: 'ok',
        routing_status: { 'langgraph-local': { http_status: 200 } },
      }));
      return;
    }

    if (pathname === '/agents') {
      await route.fulfill(jsonResponse({
        active_count: 11,
        legacy_count: 2,
        agents: [
          { agent_id: 'product_scope', status_class: 'RUNNING' },
          { agent_id: 'game_design', status_class: 'QUEUED' },
          { agent_id: 'qa_validation', status_class: 'RUNNING' },
          { agent_id: 'sentinel_truth', status_class: 'VERIFIED' },
          { agent_id: 'sentinel_runtime', status_class: 'VERIFIED' },
        ],
      }));
      return;
    }

    if (pathname === '/routing/status') {
      await route.fulfill(jsonResponse({
        status: 'ok',
        targets: {
          'langgraph-local': { http_status: 200 },
          smolagents: { http_status: 200 },
          'openhands-adapter': { http_status: 200 },
        },
      }));
      return;
    }

    if (pathname === '/autonomy/profiles') {
      await route.fulfill(jsonResponse({
        profiles: [
          {
            id: 'three_d_web_game_swarm',
            label: '3D Web Game Swarm',
            description: '11-agent execution with permanent supervisors and live browser gates.',
            agents: ['product_scope', 'qa_validation', 'sentinel_truth', 'sentinel_runtime'],
          },
        ],
      }));
      return;
    }

    if (pathname === '/platform7/contract') {
      await route.fulfill(jsonResponse({
        status: 'ok',
        contract: {
          version: 'test-contract',
          status_model: ['Idle', 'Queued', 'Running', 'Waiting', 'Blocked', 'Partial', 'Failed', 'Done', 'Stale'],
          maturity_model: ['Verified', 'Partial', 'Blocked', 'Legacy', 'Plan', 'Unknown'],
          required_supervisor_namespaces: ['sentinel_truth', 'sentinel_runtime'],
          roles: [
            { id: 'ProductScopeAgent', name: 'ProductScopeAgent', lane: 'Scope', kind: 'worker', namespace: 'product_scope', note: 'Scope owner' },
            { id: 'SentinelTruthAgent', name: 'SentinelTruthAgent', lane: 'Supervisor', kind: 'supervisor', namespace: 'sentinel_truth', note: 'Truth gate' },
            { id: 'SentinelRuntimeAgent', name: 'SentinelRuntimeAgent', lane: 'Supervisor', kind: 'supervisor', namespace: 'sentinel_runtime', note: 'Runtime gate' },
          ],
          autonomy_profiles: [
            {
              id: 'three_d_web_game_swarm',
              label: '3D Web Game Swarm',
              description: '11-agent execution with permanent supervisors and live browser gates.',
              agents: ['product_scope', 'qa_validation', 'sentinel_truth', 'sentinel_runtime'],
            },
          ],
        },
        validation: { ok: true },
      }));
      return;
    }

    if (pathname === '/autonomy/capabilities') {
      await route.fulfill(jsonResponse({ status: 'ok', limitations: [] }));
      return;
    }

    if (pathname === '/dispatch') {
      await route.fulfill(jsonResponse({ status: 'ok', dispatch_id: 'dispatch-browser-gate' }));
      return;
    }

    if (pathname === '/prompt/execute') {
      await route.fulfill(jsonResponse({ status: 'ok', run: runPayload('run-prompt-gate', 'PASS') }));
      return;
    }

    if (pathname === '/runs') {
      await route.fulfill(jsonResponse(runPayload('run-autonomy-gate')));
      return;
    }

    if (pathname === '/bootstrap/status') {
      await route.fulfill(jsonResponse({
        status: 'ok',
        ready_for_prompt_execute: true,
        bootstrap: { status: 'READY', ready: true, summary: 'Ready' },
      }));
      return;
    }

    if (pathname === '/bootstrap/start') {
      await route.fulfill(jsonResponse({
        status: 'READY',
        bootstrap: { status: 'READY', ready: true, summary: 'Ready' },
      }));
      return;
    }

    await route.fulfill(jsonResponse({ status: 'unmocked', path: pathname }, 404));
  });
}

export function attachRuntimeIssueCollector(page: Page): RuntimeIssueCollector {
  const issues: RuntimeIssue[] = [];
  let scope = 'unscoped';

  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push({ kind: 'console', scope, detail: message.text() });
    }
  });

  page.on('pageerror', (error) => {
    issues.push({ kind: 'pageerror', scope, detail: error.message });
  });

  page.on('requestfailed', (request) => {
    const failureText = request.failure()?.errorText ?? 'unknown';
    // Navigation and window-switch polling can cancel in-flight requests.
    // Treat transport-aborted requests as benign to avoid false live-gate failures.
    if (failureText.toLowerCase().includes('err_aborted')) {
      return;
    }
    issues.push({
      kind: 'requestfailed',
      scope,
      detail: `${request.method()} ${request.url()} :: ${failureText}`,
    });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      issues.push({
        kind: 'http',
        scope,
        detail: `${response.status()} ${response.request().method()} ${response.url()}`,
      });
    }
  });

  return {
    mark: () => ({ index: issues.length }),
    setScope: (nextScope: string) => {
      scope = nextScope;
    },
    since: (checkpoint: RuntimeIssueCheckpoint) => issues.slice(checkpoint.index),
  };
}

export function expectNoRuntimeIssues(issues: RuntimeIssue[], label: string) {
  const formatted = issues.map((issue) => `[${issue.kind}] ${issue.scope} :: ${issue.detail}`);
  expect(formatted, `${label} runtime issues`).toEqual([]);
}

export async function gotoApp(page: Page, url: string) {
  let lastError: unknown;
  const transientNetworkErrors = [
    'ERR_CONNECTION_REFUSED',
    'ERR_SOCKET_NOT_CONNECTED',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_CLOSED',
    'ERR_EMPTY_RESPONSE',
  ];

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransient = transientNetworkErrors.some((needle) => message.includes(needle));
      if (!isTransient || attempt === 5) {
        break;
      }
      await page.waitForTimeout(700 * attempt);
    }
  }

  throw lastError;
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const report = await page.evaluate<HorizontalOverflowReport>(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const rootScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const isWithinViewport = (rect: DOMRect) => rect.left >= -1 && rect.right <= viewportWidth + 1;
    const hasViewportContainedScrollParent = (element: HTMLElement) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const hasHorizontalScroll = ['auto', 'scroll', 'overlay'].includes(style.overflowX);
        const containsHorizontalOverflow = parent.scrollWidth > parent.clientWidth + 1;
        if (hasHorizontalScroll && containsHorizontalOverflow) {
          return isWithinViewport(parent.getBoundingClientRect());
        }
        parent = parent.parentElement;
      }
      return false;
    };

    const overflowingElements = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .flatMap((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const isVisible =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) !== 0 &&
          rect.width >= 1 &&
          rect.height >= 1;

        if (!isVisible || isWithinViewport(rect) || hasViewportContainedScrollParent(element)) {
          return [];
        }

        const selector =
          element.id ? `#${element.id}` :
          element.getAttribute('aria-label') ? `${element.tagName.toLowerCase()}[aria-label="${element.getAttribute('aria-label')}"]` :
          element.className && typeof element.className === 'string' ? `${element.tagName.toLowerCase()}.${element.className.trim().split(/\s+/).join('.')}` :
          element.tagName.toLowerCase();

        return [{
          selector,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
        }];
      })
      .slice(0, 15);

    return {
      bodyScrollWidth,
      rootScrollWidth,
      viewportWidth,
      overflowingElements,
    };
  });

  const failures = [
    report.rootScrollWidth > report.viewportWidth + 1
      ? `documentElement scrollWidth ${report.rootScrollWidth} > viewport ${report.viewportWidth}`
      : '',
    report.bodyScrollWidth > report.viewportWidth + 1
      ? `body scrollWidth ${report.bodyScrollWidth} > viewport ${report.viewportWidth}`
      : '',
    ...report.overflowingElements.map(
      (element) =>
        `${element.selector} extends [${element.left}, ${element.right}] within viewport ${report.viewportWidth}; width=${element.width}; text="${element.text}"`,
    ),
  ].filter(Boolean);

  expect(failures, `${label} horizontal overflow`).toEqual([]);
}

export async function attachScreenshotEvidence(page: Page, testInfo: TestInfo, name: string) {
  const artifactName = name.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const screenshotPath = testInfo.outputPath(`${artifactName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(artifactName, {
    path: screenshotPath,
    contentType: 'image/png',
  });

  expect(existsSync(screenshotPath), `${name} screenshot exists`).toBeTruthy();
  expect(statSync(screenshotPath).size, `${name} screenshot is not empty`).toBeGreaterThan(1000);
}
