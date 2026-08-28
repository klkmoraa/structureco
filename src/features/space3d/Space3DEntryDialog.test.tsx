// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Space3DEntryDialog } from './Space3DEntryDialog';

afterEach(cleanup);

describe('Space3DEntryDialog', () => {
  it('orients a workspace-to-3D handoff before it starts and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(<button type="button">launcher</button>);
    const launcher = screen.getByRole('button', { name: 'launcher' });
    launcher.focus();
    rerender(<><button type="button">launcher</button><Space3DEntryDialog language="es" origin="workspace" projectName="Pórtico A-04" onCancel={onCancel} onProceed={() => undefined} /></>);
    const dialog = screen.getByRole('dialog', { name: 'Abrir Space 3D experimental' });
    expect(dialog.textContent).toContain('copia espacial de «Pórtico A-04»');
    expect(dialog.textContent).toContain('no se inventarán valores');
    expect(within(dialog).getByRole('heading', { name: /qué se conserva y qué requiere revisión/i })).toBeTruthy();
    expect(dialog.textContent).toContain('G, Iy, J');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Seguir en editor 2D' })));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(<button type="button">launcher</button>);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'launcher' })));
  });

  it('labels a standalone entry as independent and waits for the user to proceed', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();
    render(<Space3DEntryDialog language="en" origin="standalone" projectName="Ignored" onCancel={() => undefined} onProceed={onProceed} />);
    expect(screen.getByText(/independent spatial project/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /what carries over and what needs review/i })).toBeTruthy();
    expect(onProceed).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Open Space 3D' }));
    expect(onProceed).toHaveBeenCalledOnce();
  });
});
