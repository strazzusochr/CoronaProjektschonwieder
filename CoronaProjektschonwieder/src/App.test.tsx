import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./SceneCanvas', () => ({
  default: function SceneCanvasMock() {
    return <div data-testid="scene-canvas-mock">SceneCanvasMock</div>;
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/control-center/state')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            ready_for_prompt_execute: true,
            bootstrap: { status: 'READY', ready: true, summary: 'Platform ready for prompt execution.' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.includes('/bootstrap/start')) {
        return new Response(
          JSON.stringify({
            status: 'BOOTING',
            bootstrap: { status: 'BOOTING', ready: false, summary: 'Bootstrap in progress.' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.includes('/bootstrap/status')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            ready_for_prompt_execute: true,
            bootstrap: { status: 'READY', ready: true, summary: 'Platform ready for prompt execution.' },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.includes('/agents')) {
        return new Response(JSON.stringify({ agents: [{ agent_id: 'local.langgraph.planner', status_class: 'VERIFIED' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/routing/status')) {
        return new Response(JSON.stringify({ status: 'ok', targets: 5 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/autonomy/profiles')) {
        return new Response(
          JSON.stringify({
            profiles: [
              {
                id: 'app_builder',
                label: 'App Builder',
                description: 'Planner to finalize',
                agents: ['local.langgraph.planner', 'local.langgraph.finalize'],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.includes('/autonomy/capabilities')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            no_limits_claim: false,
            limitations: ['Provider credits required for top-tier models'],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.includes('/autonomy/run')) {
        return new Response(JSON.stringify({ status: 'PARTIAL', run_id: 'autonomy-test-run' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/runs')) {
        return new Response(JSON.stringify({ status: 'PARTIAL', run_id: 'autonomy-test-run' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/prompt/execute')) {
        return new Response(JSON.stringify({ status: 'ok', mode: 'multi-agent', run: { status: 'PASS' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wires platform dashboard and game controls end-to-end', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /godmode superbrain control center/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /prompt command layer/i })).toBeTruthy();

    const refreshButton = await screen.findByRole('button', { name: /refresh checks|checking/i });
    if ((refreshButton.textContent ?? '').toLowerCase().includes('refresh')) {
      fireEvent.click(refreshButton);
    }
    await waitFor(() => {
      expect(screen.getByText(/checks complete/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /show advanced panels/i }));
    fireEvent.click(screen.getByRole('button', { name: /send mission dispatch/i }));
    await waitFor(() => {
      expect(screen.getByText(/dispatch response http 200/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /start system \(one-click\)|bootstrapping/i }));
    await waitFor(() => {
      expect(screen.getByText(/bootstrap (ready|request http|still running)/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /execute prompt with autonomous agents|executing/i }));
    await waitFor(() => {
      expect(screen.getByText(/prompt response http 200/i)).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: /autonomous multi-agent run/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /run fully autonomous pipeline/i }));
    await waitFor(() => {
      expect(screen.getByText(/autonomy response http 200/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /open creator sandbox/i }));
    expect(screen.getByRole('heading', { name: /godmode 3d sandbox/i })).toBeTruthy();
    expect(screen.getByTestId('metric-state').textContent).toMatch(/ready/i);

    fireEvent.click(screen.getByRole('button', { name: /start mission/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/running|won|lost/i);

    fireEvent.click(screen.getByRole('button', { name: /pause mission/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/paused/i);

    fireEvent.click(screen.getByRole('button', { name: /resume mission/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/running|won|lost/i);

    fireEvent.click(screen.getByRole('button', { name: /speed 2x/i }));
    expect(screen.getByTestId('metric-speed').textContent).toMatch(/2x/i);

    fireEvent.click(screen.getByRole('button', { name: /quality ultra/i }));
    expect(screen.getByTestId('metric-quality').textContent).toMatch(/ultra/i);

    fireEvent.click(screen.getByRole('button', { name: /select next lemming/i }));
    fireEvent.click(screen.getByRole('button', { name: /skill: builder/i }));
    expect(screen.getByTestId('metric-skill').textContent).toMatch(/builder/i);

    fireEvent.click(screen.getByRole('button', { name: /assign selected skill/i }));
    expect(screen.getByTestId('status-banner').textContent).toMatch(/builder|selected|only floater|no lemming/i);

    fireEvent.click(screen.getByRole('button', { name: /toggle grid/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle atmosphere/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle agents/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle audio/i }));
    fireEvent.click(screen.getByRole('button', { name: /toggle high contrast/i }));

    fireEvent.click(screen.getByRole('button', { name: /run math validation/i }));
    expect(screen.getByTestId('metric-math-validation').textContent).toMatch(/pass|fail/i);
  }, 20000);
});
