// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { CanvasFocusModes } from './CanvasFocusModes';

afterEach(cleanup);

describe('CanvasFocusModes', () => {
  it('exposes the four work modes and delegates a complete preset choice', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ProjectProvider><CanvasFocusModes activePreset={null} analysisAvailable onSelect={onSelect} /></ProjectProvider>);

    expect(screen.getByRole('group', { name: 'Foco del lienzo' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Foco del lienzo: Revisión' }).getAttribute('data-focus-mode')).toBe('review');

    await user.click(screen.getByRole('button', { name: 'Foco del lienzo: Revisión' }));
    await user.click(screen.getByRole('button', { name: 'Foco del lienzo: Resultados' }));

    expect(onSelect.mock.calls).toEqual([['review'], ['results']]);
  });

  it('keeps result focus unavailable before an analysis exists', () => {
    render(<ProjectProvider><CanvasFocusModes activePreset="model" analysisAvailable={false} onSelect={vi.fn()} /></ProjectProvider>);

    expect(screen.getByRole('button', { name: 'Foco del lienzo: Resultados' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Foco del lienzo: Modelo' }).getAttribute('aria-pressed')).toBe('true');
  });
});
