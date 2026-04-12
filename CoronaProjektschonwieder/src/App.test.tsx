import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders and wires every primary control in the 3D test game', async () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /godmode arena lab/i,
      })
    ).toBeTruthy();
    expect(screen.getByTestId('metric-state').textContent).toMatch(/standby/i);
    expect(screen.getByRole('button', { name: /activate 3d arena/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /activate 3d arena/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/live/i);

    fireEvent.click(screen.getByRole('button', { name: /veteran mode/i }));
    expect(screen.getByTestId('metric-difficulty').textContent).toMatch(/veteran/i);

    fireEvent.click(screen.getByRole('button', { name: /collect orb/i }));
    expect(screen.getByTestId('metric-score').textContent).toMatch(/15/i);

    fireEvent.click(screen.getByRole('button', { name: /next wave/i }));
    expect(screen.getByTestId('metric-wave').textContent).toMatch(/2/i);

    fireEvent.click(screen.getByRole('button', { name: /trigger hit/i }));
    expect(screen.getByTestId('metric-lives').textContent).toMatch(/2/i);

    fireEvent.click(screen.getByRole('button', { name: /toggle grid/i }));
    expect(screen.getByTestId('metric-grid').textContent).toMatch(/off/i);

    fireEvent.click(screen.getByRole('button', { name: /toggle atmosphere/i }));
    expect(screen.getByTestId('metric-atmosphere').textContent).toMatch(/off/i);

    fireEvent.click(screen.getByRole('button', { name: /toggle auto rotate/i }));
    expect(screen.getByTestId('metric-rotate').textContent).toMatch(/off/i);

    fireEvent.click(screen.getByRole('button', { name: /switch to sunset/i }));
    expect(screen.getByTestId('metric-theme').textContent).toMatch(/sunset/i);

    fireEvent.click(screen.getByRole('button', { name: /pause simulation/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/paused/i);

    fireEvent.click(screen.getByRole('button', { name: /resume simulation/i }));
    expect(screen.getByTestId('metric-state').textContent).toMatch(/live/i);

    fireEvent.click(screen.getByRole('button', { name: /reset mission/i }));
    expect(screen.getByTestId('metric-wave').textContent).toMatch(/1/i);
    expect(screen.getByTestId('metric-score').textContent).toMatch(/0/i);
    expect(screen.getByTestId('metric-lives').textContent).toMatch(/3/i);
    expect(screen.getByTestId('metric-difficulty').textContent).toMatch(/rookie/i);
    expect(screen.getByTestId('metric-theme').textContent).toMatch(/neon/i);
  });
});
