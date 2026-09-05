// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

afterEach(() => cleanup());

const renderModal = (open = true, onClose = () => {}) => render(
  <ProjectProvider>
    <KeyboardShortcutsModal open={open} onClose={onClose} />
  </ProjectProvider>,
);

describe('KeyboardShortcutsModal', () => {
  it('renders correctly when open with title and all groups', () => {
    renderModal(true);

    const dialog = screen.getByRole('dialog', { name: /atajos de teclado/i });
    expect(dialog).toBeTruthy();

    expect(screen.getByText(/herramientas y modelado/i)).toBeTruthy();
    expect(screen.getByText(/espacio de trabajo y comandos/i)).toBeTruthy();
    expect(screen.getByText(/hoja de datos/i)).toBeTruthy();

    // Verifies drawing tools from TOOL_REGISTRY
    expect(screen.getByText('Seleccionar')).toBeTruthy();
    expect(screen.getByText('Desplazar')).toBeTruthy();
    expect(screen.getByText('Nodo')).toBeTruthy();
    expect(screen.getByText('Miembro')).toBeTruthy();

    // Verifies workspace shortcuts
    expect(screen.getByText('Abrir paleta de comandos')).toBeTruthy();
    expect(screen.getByText('Deshacer último cambio')).toBeTruthy();
    expect(screen.getByText('Rehacer cambio')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(true, onClose);

    const closeButton = screen.getByRole('button', { name: 'Cerrar' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(true, onClose);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render content when closed', () => {
    renderModal(false);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
