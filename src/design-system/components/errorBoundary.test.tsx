// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './errorBoundary';

const ThrowDuringRender = () => {
  throw new Error('render failed');
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('replaces a failed React subtree with a recovery message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ErrorBoundary><ThrowDuringRender /></ErrorBoundary>);

    expect(screen.getByRole('alert').textContent).toContain('Algo se rompió en structureCo');
    expect(screen.getByRole('button', { name: /recargar/i })).toBeTruthy();
  });
});
