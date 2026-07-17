// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NewExerciseDialog } from './NewExerciseDialog';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

afterEach(() => cleanup());

describe('NewExerciseDialog', () => {
  it('creates a parameterized classroom exercise', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewExerciseDialog open onClose={vi.fn()} onCreate={onCreate} />);
    expect(screen.getByRole('dialog', { name: /nuevo ejercicio/i })).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: /viga simplemente apoyada/i }));
    const length = screen.getByRole('spinbutton', { name: /longitud o claro/i });
    await user.clear(length);
    await user.type(length, '12');
    await user.click(screen.getByRole('button', { name: /crear ejercicio/i }));

    expect(onCreate).toHaveBeenCalledOnce();
    const project = onCreate.mock.calls[0][0];
    expect(project.settings.calculationMode).toBe('classroom');
    expect(project.nodes[1].x).toBe(12);
  });

  it('closes with Escape and renders nothing while closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<NewExerciseDialog open onClose={onClose} onCreate={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<NewExerciseDialog open={false} onClose={onClose} onCreate={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('supports arrow navigation and restores focus to its opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<><button type="button">Abrir ejercicio</button><NewExerciseDialog open={false} onClose={onClose} onCreate={vi.fn()} /></>);
    const opener = screen.getByRole('button', { name: /abrir ejercicio/i });
    opener.focus();
    rerender(<><button type="button">Abrir ejercicio</button><NewExerciseDialog open onClose={onClose} onCreate={vi.fn()} /></>);
    const blank = await screen.findByRole('radio', { name: /desde cero/i });
    blank.focus();
    fireEvent.keyDown(blank, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('radio', { name: /viga simplemente apoyada/i }).getAttribute('aria-checked')).toBe('true'));
    await user.keyboard('{Escape}');
    rerender(<><button type="button">Abrir ejercicio</button><NewExerciseDialog open={false} onClose={onClose} onCreate={vi.fn()} /></>);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /abrir ejercicio/i })));
  });
});
