import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./SceneCanvas', () => ({
  default: function SceneCanvasMock() {
    return <div data-testid="scene-canvas-mock">Scene ready</div>;
  },
}));

describe('App', () => {
  it('renders the mission panel and scene viewport', async () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /corona v4/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/3d viewport/i)).toBeInTheDocument();
    expect(screen.getByText(/browser smoke-tested/i)).toBeInTheDocument();
    expect(screen.getByText(/viewport standby/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /activate 3d scene/i }));
    expect(await screen.findByTestId('scene-canvas-mock')).toBeInTheDocument();
  });
});
