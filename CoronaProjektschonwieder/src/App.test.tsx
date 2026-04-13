import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./SceneCanvas', () => ({
  default: function SceneCanvasMock() {
    return <div data-testid="scene-canvas-mock">SceneCanvasMock</div>;
  },
}));

describe('App', () => {
  it('wires mission controls, options, and skill assignment flow', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /godmode lemmings 3d lab/i })).toBeTruthy();
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
  });
});
