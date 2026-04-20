import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

describe('App - three window platform', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/control-center/state')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            ready_for_prompt_execute: true,
            bootstrap: { status: 'READY', ready: true, summary: 'Platform ready.' },
            latest_run: {
              run_id: 'run-1',
              status: 'RUNNING',
              profile_id: 'three_d_web_game_swarm',
              profile_label: '3D Web Game Swarm',
              forwarded_steps: 1,
              total_steps: 2,
              current_step: 1,
              current_agent: 'product_scope',
              steps: [
                {
                  step: 1,
                  agent: 'product_scope',
                  status: 'forwarded',
                  runtime_target: 'langgraph-local',
                  trace_id: 'trace-1',
                  task_id: 'task-1',
                  reason: 'planning step',
                },
              ],
            },
            latest_control_event: {
              event_id: 'evt-1',
              timestamp: '2026-04-17T12:00:00.000Z',
              action: 'retry-last-step',
              state: 'RUNNING',
              reason: 'Last step moved back to queued.',
              next_action: 'Monitor the rerun in Glasshouse.',
              session_id: 'session-1',
              run_id: 'run-1',
              trace_id: 'trace-1',
              span_id: 'span-1',
              task_id: 'task-1',
              step_id: 'step-1',
              agent_id: 'product_scope',
              role: 'ProductScopeAgent',
              runtime_target: 'langgraph-local',
              source: 'window:glasshouse',
              event_file: '/runtime/control_events/evt-1.json',
              extra: { changed: true },
            },
            service_probes: {
              openhands: { http_status: 200 },
              n8n: { http_status: 200 },
              litellm: { http_status: 200 },
              'devtools-bridge': { http_status: 200 },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/health')) {
        return new Response(JSON.stringify({ routing_status: { 'langgraph-local': { http_status: 200 } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/agents')) {
        return new Response(
          JSON.stringify({
            active_count: 11,
            legacy_count: 2,
            agents: [
              { agent_id: 'product_scope', status_class: 'RUNNING' },
              { agent_id: 'sentinel_truth', status_class: 'VERIFIED' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/routing/status')) {
        return new Response(JSON.stringify({ status: 'ok', targets: { 'langgraph-local': { http_status: 200 } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/autonomy/profiles')) {
        return new Response(
          JSON.stringify({
            profiles: [
              {
                id: 'three_d_web_game_swarm',
                label: '3D Web Game Swarm',
                description: '11-agent execution',
                agents: ['product_scope', 'sentinel_truth', 'sentinel_runtime'],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/platform7/contract')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            contract: {
              version: 'test-contract',
              status_model: ['Idle', 'Queued', 'Running', 'Waiting', 'Blocked', 'Partial', 'Failed', 'Done', 'Stale'],
              maturity_model: ['Verified', 'Partial', 'Blocked', 'Legacy', 'Plan', 'Unknown'],
              required_supervisor_namespaces: ['sentinel_truth', 'sentinel_runtime'],
              roles: [
                { id: 'ProductScopeAgent', name: 'ProductScopeAgent', lane: 'Scope', kind: 'worker', namespace: 'product_scope', note: 'planning' },
                { id: 'SentinelTruthAgent', name: 'SentinelTruthAgent', lane: 'Supervisor', kind: 'supervisor', namespace: 'sentinel_truth', note: 'truth gate' },
                { id: 'SentinelRuntimeAgent', name: 'SentinelRuntimeAgent', lane: 'Supervisor', kind: 'supervisor', namespace: 'sentinel_runtime', note: 'runtime gate' },
              ],
              tooling_requirements: [
                { id: 'dispatch-hub', label: 'Dispatch Hub API', kind: 'runtime', required: true, evidence: 'health HTTP 200' },
                { id: 'chrome-devtools', label: 'Chrome DevTools MCP', kind: 'browser', required: true, evidence: 'console/network snapshot' },
                { id: 'puppeteer', label: 'Puppeteer MCP', kind: 'browser', required: true, evidence: 'live smoke trace' },
              ],
              autonomy_profiles: [
                {
                  id: 'three_d_web_game_swarm',
                  label: '3D Web Game Swarm',
                  description: '11-agent execution',
                  agents: ['product_scope', 'sentinel_truth', 'sentinel_runtime'],
                },
              ],
            },
            validation: { ok: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/autonomy/capabilities')) {
        return new Response(JSON.stringify({ status: 'ok', limitations: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/dispatch')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('/prompt/execute')) {
        return new Response(
          JSON.stringify({
            run: {
              run_id: 'run-2',
              status: 'PASS',
              profile_id: 'three_d_web_game_swarm',
              profile_label: '3D Web Game Swarm',
              forwarded_steps: 2,
              total_steps: 2,
              current_step: 2,
              current_agent: 'sentinel_truth',
              steps: [
                { step: 1, agent: 'product_scope', status: 'forwarded', trace_id: 'trace-2', task_id: 'task-2' },
                { step: 2, agent: 'sentinel_truth', status: 'pass', trace_id: 'trace-2', task_id: 'task-2' },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/runs')) {
        return new Response(
          JSON.stringify({
            run_id: 'run-3',
            status: 'RUNNING',
            profile_id: 'three_d_web_game_swarm',
            profile_label: '3D Web Game Swarm',
            forwarded_steps: 1,
            total_steps: 3,
            current_step: 1,
            current_agent: 'product_scope',
            steps: [{ step: 1, agent: 'product_scope', status: 'running', trace_id: 'trace-3', task_id: 'task-3' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/bootstrap/start')) {
        return new Response(JSON.stringify({ status: 'BOOTING' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/bootstrap/status')) {
        return new Response(
          JSON.stringify({ bootstrap: { status: 'READY', ready: true, summary: 'Ready' }, ready_for_prompt_execute: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders commander mode with key controls and supervisor roles', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /transparent multi-agent developer platform/i })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: /commander/i }).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/sentineltruthagent/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sentinelruntimeagent/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /save connection/i }));
    await waitFor(() => {
      expect(screen.getByText(/saved connection targets/i)).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /dispatch starten/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/dispatch response http 200/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /prompt ausfuehren/i }));
    await waitFor(() => {
      expect(screen.getByText(/run run-2 is pass/i)).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/run_id: run-1 \| trace_id: trace-1 \| task_id: task-1/i)).toBeTruthy();
      expect(screen.getByText(/runtime_target: langgraph-local \| session_id: session-1 \| span_id: span-1/i)).toBeTruthy();
    });

  });

  it('uses 30000ms timeout for dispatch requests', async () => {
    render(<App />);
    const timeoutSpy = vi.spyOn(window, 'setTimeout');
    timeoutSpy.mockClear();

    fireEvent.click(screen.getAllByRole('button', { name: /dispatch starten/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/dispatch response http 200/i)).toBeTruthy();
    });
    expect(timeoutSpy.mock.calls.some((call) => call[1] === 30000)).toBe(true);
  });

  it('classifies AbortError as timeout in dispatch feedback', async () => {
    render(<App />);
    const fetchMock = vi.mocked(globalThis.fetch);
    const defaultImpl = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/dispatch')) {
        throw new DOMException('Aborted', 'AbortError');
      }
      if (defaultImpl) return await defaultImpl(input, init);
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    fireEvent.click(screen.getAllByRole('button', { name: /dispatch starten/i })[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/dispatch failed: request timed out after 30000ms/i).length).toBeGreaterThan(0);
    });
  });

  it('falls back to bundled platform contract when hub contract endpoints are unreachable', async () => {
    render(<App />);
    const fetchMock = vi.mocked(globalThis.fetch);
    const defaultImpl = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/platform7/contract') || url.includes('/autonomy/profiles')) {
        return new Response(JSON.stringify({ status: 'not-found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (defaultImpl) return await defaultImpl(input, init);
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText(/sentineltruthagent/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/sentinelruntimeagent/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/profile source:/i).textContent).toContain('bundled-contract');
    });
  });

  it('maps virtual agent statuses so roles do not stay in default plan state', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const defaultImpl = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/agents')) {
        return new Response(
          JSON.stringify({
            active_count: 29,
            legacy_count: 1,
            active_agents: [{ agent_id: 'local.smolagents.godmode_manager', status_class: 'VERIFIED' }],
            virtual_agents: [
              { agent_id: 'product_scope', status_class: 'VERIFIED' },
              { agent_id: 'sentinel_truth', status_class: 'VERIFIED' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (defaultImpl) return await defaultImpl(input, init);
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByLabelText(/Verified\./i).length).toBeGreaterThan(0);
      expect(screen.queryByLabelText(/Plan\./i)).toBeNull();
    });
  });
});
