import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

function BrokenScene(): never {
  throw new Error('Scene failed');
}

describe('CanvasErrorBoundary', () => {
  it('renders fallback content after a render error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const suppressWindowError = (event: ErrorEvent) => event.preventDefault();

    window.addEventListener('error', suppressWindowError);

    render(
      <CanvasErrorBoundary fallback={<div>Viewport fallback active</div>}>
        <BrokenScene />
      </CanvasErrorBoundary>
    );

    expect(screen.getByText(/viewport fallback active/i)).toBeInTheDocument();

    window.removeEventListener('error', suppressWindowError);
    consoleErrorSpy.mockRestore();
  });
});
