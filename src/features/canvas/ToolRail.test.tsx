// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useContext } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider, useProject } from '../../store/ProjectContext';
import { onWorkspaceCommand } from '../workspace/workspaceCommands';
import { ShellCompositionContext } from '../workspace/useShellComposition';
import type { ShellClass } from '../workspace/shellComposition';
import { SurfacePresentationContext } from '../workspace/SurfacePresentationContext';
import { SurfacePresentationProvider } from '../workspace/SurfacePresentationProvider';
import { ToolRail } from './ToolRail';

const ActiveToolStatus = () => {
  const { activeTool } = useProject();
  return <output aria-label="herramienta activa">{activeTool}</output>;
};

const SelectionSetter = () => {
  const { setSelection } = useProject();
  return <button type="button" onClick={() => setSelection({ kind: 'node', id: 'N1' })}>seleccionar nodo</button>;
};

const GeneratorStateHarness = () => {
  const { activeTool, setActiveTool } = useProject();
  const surfacePresentation = useContext(SurfacePresentationContext);
  const generatorOpen = surfacePresentation?.stateFor('generator').open ?? false;
  return <>
    <button type="button" data-testid="activate-node" onClick={() => setActiveTool('node')}>activar Nodo</button>
    <button type="button" data-testid="open-generator" onClick={() => surfacePresentation?.openSurface('generator')}>abrir generador</button>
    <button type="button" data-testid="cancel-generator" onClick={() => surfacePresentation?.closeSurface('generator')}>Cancelar generador</button>
    <button type="button" data-testid="generate-structure" onClick={() => surfacePresentation?.closeSurface('generator')}>Generar estructura</button>
    <output data-testid="generator-state">{generatorOpen ? 'open' : 'closed'}</output>
    <output aria-label="herramienta activa">{activeTool}</output>
  </>;
};

/** La forma del riel la decide `shellClass` (CRI-98): se fija explícito por
 * prueba en vez de depender del viewport por defecto de jsdom. */
const renderToolRail = (shellClass: ShellClass = 'X2') => render(
  <ShellCompositionContext.Provider value={{ shellClass, phone: shellClass === 'K0' }}>
    <ProjectProvider>
      <ToolRail />
      <ActiveToolStatus />
    </ProjectProvider>
  </ShellCompositionContext.Provider>,
);

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('ToolRail mobile action sheets', () => {
  it('returns to Seleccionar when generator Cancelar or Generar closes its surface', async () => {
    const user = userEvent.setup();
    const backgroundRef = createRef<HTMLDivElement>();
    render(
      <ShellCompositionContext.Provider value={{ shellClass: 'X2', phone: false }}>
        <ProjectProvider>
          <SurfacePresentationProvider shellClass="X2" backgroundRef={backgroundRef}>
            <div ref={backgroundRef}>
              <ToolRail />
              <GeneratorStateHarness />
            </div>
          </SurfacePresentationProvider>
        </ProjectProvider>
      </ShellCompositionContext.Provider>,
    );

    await user.click(screen.getByTestId('activate-node'));
    expect(screen.getByLabelText('herramienta activa').textContent).toBe('node');

    await user.click(screen.getByTestId('open-generator'));
    await waitFor(() => expect(screen.getByTestId('generator-state').textContent).toBe('open'));
    await user.click(screen.getByTestId('cancel-generator'));
    await waitFor(() => expect(screen.getByLabelText('herramienta activa').textContent).toBe('select'));

    await user.click(screen.getByTestId('activate-node'));
    await user.click(screen.getByTestId('open-generator'));
    await waitFor(() => expect(screen.getByTestId('generator-state').textContent).toBe('open'));
    await user.click(screen.getByTestId('generate-structure'));
    await waitFor(() => expect(screen.getByLabelText('herramienta activa').textContent).toBe('select'));
  });

  it('keeps workspace settings and dock placement out of the modeling dock', () => {
    renderToolRail('K0');
    expect(screen.queryByRole('button', { name: /paneles de trabajo/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /poner herramientas/i })).toBeNull();
  });

  it('renders a four-action mobile dock with plain-language destinations', () => {
    const { container } = renderToolRail('K0');
    const dock = container.querySelector<HTMLElement>('.mobile-tool-dock');

    expect(dock).toBeTruthy();
    expect(within(dock as HTMLElement).getAllByRole('button')).toHaveLength(4);
    expect(within(dock as HTMLElement).getByRole('button', { name: 'Modelo' })).toBeTruthy();
    expect(within(dock as HTMLElement).getByRole('button', { name: 'Añadir al modelo' })).toBeTruthy();
    expect(within(dock as HTMLElement).getByRole('button', { name: /herramientas de carga/i })).toBeTruthy();
    expect(within(dock as HTMLElement).getByRole('button', { name: /resultados y diagramas/i })).toBeTruthy();
  });

  it('renders the X2 rail as a four-group floating dock with each registered tool exactly once', () => {
    const { container } = renderToolRail('X2');

    const dock = container.querySelector<HTMLElement>('[data-tool-rail="dock"]');
    expect(dock).not.toBeNull();
    const groups = [...(dock?.querySelectorAll<HTMLElement>('[data-dock-group]') ?? [])];
    expect(groups.map((group) => group.dataset.dockGroup)).toEqual(['navigate', 'build', 'loads', 'refine']);

    const toolIds = [...(dock?.querySelectorAll<HTMLElement>('[data-desktop-dock-tools] [data-tool-id]') ?? [])]
      .map((tool) => tool.dataset.toolId);
    expect(toolIds).toHaveLength(12);
    expect(new Set(toolIds).size).toBe(12);
    expect(groups.at(-1)?.querySelectorAll('[data-source-tool-group="inspect"], [data-source-tool-group="edit"]')).toHaveLength(4);
  });

  it('folds the X2 dock into the active tool and restores every group', async () => {
    const user = userEvent.setup();
    const { container } = renderToolRail('X2');

    await user.click(screen.getByRole('button', { name: 'Compactar herramientas' }));
    expect(container.querySelectorAll('[data-dock-group]')).toHaveLength(0);
    expect(container.querySelector('[data-desktop-dock-tools] [data-tool-id="select"]')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Mostrar todas las herramientas' }));
    expect(container.querySelectorAll('[data-dock-group]')).toHaveLength(4);
  });

  it('offers an explicit compact desktop rail without changing tool identity', () => {
    const { container } = renderToolRail('M1');
    expect(container.querySelector('[data-tool-rail="compact"]')).toBeTruthy();
    // Doce herramientas del registro, Generar y Buscar. Las superficies de
    // trabajo viven en Ajustes, no consumen una posición del riel.
    expect(container.querySelectorAll('.desktop-tool-list .sc-tool-button.is-compact')).toHaveLength(14);
    expect(container.querySelector('[data-tool-id="pointLoad"]')?.getAttribute('aria-keyshortcuts')).toBe('P');
    expect(container.querySelector('[data-tool-id="delete"]')?.getAttribute('aria-keyshortcuts')).toBe('Delete Backspace');
  });

  it('groups every desktop tool in the four desktop intentions without losing actions', () => {
    renderToolRail();

    expect(within(screen.getByRole('group', { name: /navegar/i })).getAllByRole('button')).toHaveLength(3);
    // Nudo, barra y apoyo, más el generador de estructuras.
    expect(within(screen.getByRole('group', { name: /^crear$/i })).getAllByRole('button')).toHaveLength(4);
    expect(within(screen.getByRole('group', { name: /^cargas$/i })).getAllByRole('button')).toHaveLength(3);
    expect(within(screen.getByRole('group', { name: /anotar e inspeccionar.*editar/i })).getAllByRole('button')).toHaveLength(4);
    expect(document.querySelectorAll('[data-tool-id]')).toHaveLength(12);
  });

  it('opens Buscar comandos from the Navegar group in the ToolRail', async () => {
    const user = userEvent.setup();
    const openPalette = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-command-palette', openPalette);
    renderToolRail();

    const navigate = screen.getByRole('group', { name: /navegar/i });
    const commandSearch = within(navigate).getByRole('button', { name: /abrir la paleta de comandos/i });
    expect(commandSearch.getAttribute('aria-keyshortcuts')).toContain('Control+K');
    await user.click(commandSearch);

    expect(openPalette).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('offers the contextual structural editor from Edit only with a selection', async () => {
    const user = userEvent.setup();
    const openEditor = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-structural-edit', openEditor);
    render(
      <ShellCompositionContext.Provider value={{ shellClass: 'X2', phone: false }}>
        <ProjectProvider>
          <ToolRail />
          <SelectionSetter />
        </ProjectProvider>
      </ShellCompositionContext.Provider>,
    );

    expect(screen.queryByRole('button', { name: /editar selección/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /seleccionar nodo/i }));
    await user.click(screen.getByRole('button', { name: /editar selección/i }));

    expect(openEditor).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('offers the structure generator from Create without needing a selection', async () => {
    const user = userEvent.setup();
    const openGenerator = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-structure-generator', openGenerator);
    renderToolRail();

    // Generar crea geometría en vez de transformar la que hay: no puede
    // depender de que algo esté seleccionado.
    const create = screen.getByRole('group', { name: /^crear$/i });
    await user.click(within(create).getByRole('button', { name: /generar estructura/i }));

    expect(openGenerator).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('reaches the structure generator from the compact Añadir sheet', async () => {
    const user = userEvent.setup();
    const openGenerator = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-structure-generator', openGenerator);
    render(
      <ShellCompositionContext.Provider value={{ shellClass: 'K0', phone: true }}>
        <ProjectProvider>
          <div className="app-shell"><ToolRail /></div>
        </ProjectProvider>
      </ShellCompositionContext.Provider>,
    );
    const addButton = screen.getByRole('button', { name: 'Añadir al modelo' });
    await user.click(addButton);

    const command = document.querySelector<HTMLButtonElement>('.mobile-tool-palette-build [data-structure-generator-command]');
    expect(command).toBeTruthy();
    await user.click(command!);

    // La hoja móvil difiere el comando un frame a propósito (`ToolRail.tsx`:
    // `openStructureGeneratorFromMobile`), para cerrarse y devolver la
    // inertness antes de que el generador tome el foco. Sin esperar ese frame
    // la aserción gana o pierde según lo cargado que venga el entorno.
    await waitFor(() => expect(openGenerator).toHaveBeenCalledOnce());
    // La inertness sí se restituye de forma síncrona al cerrar.
    expect(document.querySelector<HTMLElement>('.app-shell')?.inert).toBe(false);
    unsubscribe();
  });

  it('opens the portaled load sheet and selects a point load', async () => {
    const user = userEvent.setup();
    const { container } = renderToolRail('K0');
    const loadButton = screen.getByRole('button', { name: /herramientas de carga/i });

    await user.click(loadButton);

    const dialog = screen.getByRole('dialog', { name: /carga/i });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const loadMenu = screen.getByRole('menu', { name: /añadir carga/i });
    expect(container.contains(loadMenu)).toBe(false);
    expect(loadButton.getAttribute('aria-expanded')).toBe('true');

    await user.click(within(loadMenu).getByRole('menuitemradio', { name: /carga puntual/i }));

    expect(screen.getByLabelText('herramienta activa').textContent).toBe('pointLoad');
    expect(screen.queryByRole('menu', { name: /añadir carga/i })).toBeNull();
    expect(loadButton.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(document.activeElement).toBe(loadButton));
  });

  it('opens the full results surface from the mobile dock', async () => {
    const user = userEvent.setup();
    const openResults = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-results', openResults);
    renderToolRail('K0');

    const resultsButton = screen.getByRole('button', { name: /resultados y diagramas/i });
    await user.click(resultsButton);

    expect(openResults).toHaveBeenCalledWith(expect.objectContaining({ trigger: resultsButton }));
    unsubscribe();
  });

  it('returns focus when the touch sheet closes through its backdrop', async () => {
    const user = userEvent.setup();
    renderToolRail('K0');
    const addButton = screen.getByRole('button', { name: 'Añadir al modelo' });
    await user.click(addButton);
    expect(screen.getByRole('dialog', { name: /añadir al modelo/i })).toBeTruthy();

    const backdrop = document.querySelector<HTMLElement>('.mobile-tool-sheet-backdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.pointerDown(backdrop as HTMLElement);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /añadir al modelo/i })).toBeNull());
    expect(document.activeElement).toBe(addButton);
  });

  it('keeps advanced tools one deliberate step deeper and returns focus to Añadir', async () => {
    const user = userEvent.setup();
    renderToolRail('K0');
    const addButton = screen.getByRole('button', { name: 'Añadir al modelo' });

    await user.click(addButton);
    await user.click(screen.getByRole('menuitem', { name: /más herramientas/i }));

    const moreMenu = screen.getByRole('menu', { name: /más herramientas/i });
    const menu = within(moreMenu);
    expect(within(menu.getByRole('group', { name: /navegar/i })).getAllByRole('menuitemradio')).toHaveLength(1);
    expect(within(menu.getByRole('group', { name: /anotar e inspeccionar/i })).getAllByRole('menuitemradio')).toHaveLength(2);
    expect(within(menu.getByRole('group', { name: /^editar$/i })).getAllByRole('menuitemradio')).toHaveLength(2);
    const pan = menu.getByRole('menuitemradio', { name: /^desplazar\./i });
    expect(menu.getByRole('menuitemradio', { name: /^cota\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^dividir miembro\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^corte\./i })).toBeTruthy();
    expect(menu.getByRole('menuitemradio', { name: /^eliminar\./i })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(pan));

    const dialog = screen.getByRole('dialog', { name: /herramientas/i });
    const close = within(dialog).getByRole('button', { name: 'Cerrar' });
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(close);
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(menu.getByRole('menuitemradio', { name: /^eliminar\./i }));
    await user.tab();
    expect(document.activeElement).toBe(close);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: /más herramientas/i })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(addButton));
  });

  it('opens Buscar comandos from advanced mobile tools without leaving a sheet behind', async () => {
    const user = userEvent.setup();
    const openPalette = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-command-palette', openPalette);
    renderToolRail('K0');
    const addButton = screen.getByRole('button', { name: 'Añadir al modelo' });
    await user.click(addButton);
    await user.click(screen.getByRole('menuitem', { name: /más herramientas/i }));

    const navigate = within(screen.getByRole('menu', { name: /más herramientas/i }))
      .getByRole('group', { name: /navegar/i });
    await user.click(within(navigate).getByRole('menuitem', { name: /abrir la paleta de comandos/i }));

    expect(openPalette).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: /más herramientas/i })).toBeNull();
    unsubscribe();
  });

  it('closes advanced tools before opening Edit and restores the canvas app from inert state', async () => {
    const user = userEvent.setup();
    const openEditor = vi.fn();
    const unsubscribe = onWorkspaceCommand('open-structural-edit', openEditor);
    render(
      <ShellCompositionContext.Provider value={{ shellClass: 'K0', phone: true }}>
        <ProjectProvider>
          <div className="app-shell"><ToolRail /><SelectionSetter /></div>
        </ProjectProvider>
      </ShellCompositionContext.Provider>,
    );
    await user.click(screen.getByRole('button', { name: /seleccionar nodo/i }));
    const addButton = screen.getByRole('button', { name: 'Añadir al modelo' });
    await user.click(addButton);
    await user.click(screen.getByRole('menuitem', { name: /más herramientas/i }));
    expect(document.querySelector<HTMLElement>('.app-shell')?.inert).toBe(true);

    const moreSheet = document.querySelector<HTMLElement>('.mobile-tool-palette-more');
    expect(moreSheet).toBeTruthy();
    const editSelection = moreSheet?.querySelector<HTMLButtonElement>('[data-structural-edit-command]');
    expect(editSelection).toBeTruthy();
    await user.click(editSelection!);
    await waitFor(() => expect(document.querySelector('.mobile-tool-palette-more')).toBeNull());
    await waitFor(() => expect(document.querySelector<HTMLElement>('.app-shell')?.inert).toBe(false));
    await waitFor(() => expect(openEditor).toHaveBeenCalledOnce());
    unsubscribe();
  });
});
