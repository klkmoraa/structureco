// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProjectProvider, useProject } from '../store/ProjectContext';
import { ToolBar } from './ToolBar';

const ActiveToolStatus = () => {
  const { activeTool } = useProject();
  return <output aria-label="herramienta activa">{activeTool}</output>;
};

const renderToolBar = () => render(
  <ProjectProvider>
    <ToolBar />
    <ActiveToolStatus />
  </ProjectProvider>,
);

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('ToolBar mobile action sheets', () => {
  it('opens the portaled load sheet and selects a point load', async () => {
    const user = userEvent.setup();
    const { container } = renderToolBar();
    const loadButton = screen.getByRole('button', { name: /herramientas de carga/i });

    await user.click(loadButton);

    const loadMenu = screen.getByRole('menu', { name: /añadir carga/i });
    expect(container.contains(loadMenu)).toBe(false);
    expect(loadButton.getAttribute('aria-expanded')).toBe('true');

    await user.click(within(loadMenu).getByRole('menuitemradio', { name: /carga puntual/i }));

    expect(screen.getByLabelText('herramienta activa').textContent).toBe('pointLoad');
    expect(screen.queryByRole('menu', { name: /añadir carga/i })).toBeNull();
    expect(loadButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows every additional tool and returns focus to Más after Escape', async () => {
    const user = userEvent.setup();
    renderToolBar();
    const moreButton = screen.getByRole('button', { name: /más herramientas/i });

    await user.click(moreButton);

    const moreMenu = screen.getByRole('menu', { name: /más herramientas/i });
    const menu = within(moreMenu);
    const pan = menu.getByRole('menuitemradio', { name: /^desplazar\./i });
    expect(menu.getByRole('menuitemradio', { name: /^cota\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^dividir miembro\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^corte\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^eliminar\./i })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(pan));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: /más herramientas/i })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(moreButton));
  });
});
