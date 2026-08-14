// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import type { Selection } from '../../types';
import { workspaceCommandEventName } from '../workspace/workspaceCommands';
import { DatasheetPanel } from './DatasheetPanel';
import { createDatasheetProject } from './datasheetFixtures';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const setup = () => userEvent.setup({ delay: null });

/**
 * Estable a propósito: un `onOpenChange` en línea cambia de identidad en cada
 * render y el efecto de foco del Drawer volvería a llevarse el foco a su botón
 * de cerrar. `WorkspaceShell` pasa el `setDatasheetOpen` del estado.
 */
const keepOpen = () => {};

/**
 * Siembra el proyecto de la fixture y expone la selección viva del workspace.
 *
 * La prueba lee la selección del **store**, no de la tabla: eso es exactamente
 * lo que hay que demostrar, que el datasheet no lleva selección propia.
 */
const Harness = ({ onSelection }: { onSelection: (selection: Selection) => void }) => {
  const { project, replaceProject } = useProjectModel();
  const { selection } = useWorkspaceUI();
  onSelection(selection);
  if (project.id !== 'datasheet-fixture') {
    return <button type="button" onClick={() => replaceProject(createDatasheetProject())}>sembrar</button>;
  }
  return <DatasheetPanel open onOpenChange={keepOpen} />;
};

const renderDatasheet = async () => {
  const user = setup();
  const selectionRef = { current: null as Selection };
  render(
    <ProjectProvider>
      <Harness onSelection={(selection) => { selectionRef.current = selection; }} />
    </ProjectProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'sembrar' }));
  await screen.findByRole('grid');
  return { user, selectionRef };
};

const rowFor = (id: string) => screen.getByRole('rowheader', { name: id }).closest('tr') as HTMLElement;

describe('datasheet panel', () => {
  it('projects the model without holding a copy of it', async () => {
    await renderDatasheet();
    const grid = screen.getByRole('grid');
    // Cabecera + tres nudos.
    expect(within(grid).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByRole('rowheader', { name: 'N1' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'N3' })).toBeTruthy();
  });

  it('shows units in the column header and values converted to them', async () => {
    await renderDatasheet();
    expect(screen.getByRole('columnheader', { name: /^X \(m\)/ })).toBeTruthy();
    expect(within(rowFor('N3')).getByText('6')).toBeTruthy();
  });

  it('switches to members and shows their own columns', async () => {
    const { user } = await renderDatasheet();
    await user.click(screen.getByRole('button', { name: /Barras/ }));
    expect(screen.getByRole('columnheader', { name: /^Nudo i/ })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'M2' })).toBeTruthy();
  });

  it('narrows the table with the search box', async () => {
    const { user } = await renderDatasheet();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en la tabla' }), 'N3');
    await waitFor(() => expect(within(screen.getByRole('grid')).getAllByRole('row')).toHaveLength(2));
    expect(screen.getByText('1 de 3')).toBeTruthy();
  });

  it('narrows the table with a facet filter', async () => {
    const { user } = await renderDatasheet();
    await user.click(screen.getByRole('button', { name: /Empotrado/ }));
    await waitFor(() => expect(screen.queryByRole('rowheader', { name: 'N2' })).toBeNull());
    expect(screen.getByRole('rowheader', { name: 'N1' })).toBeTruthy();
  });

  it('sorts a numeric column as numbers and returns to model order on the third click', async () => {
    const { user } = await renderDatasheet();
    const header = screen.getByRole('button', { name: /^X \(m\)/ });
    await user.click(header);
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^X \(m\)/ }).getAttribute('aria-sort')).toBe('ascending'));
    await user.click(header);
    expect(screen.getByRole('columnheader', { name: /^X \(m\)/ }).getAttribute('aria-sort')).toBe('descending');
    await user.click(header);
    expect(screen.getByRole('columnheader', { name: /^X \(m\)/ }).getAttribute('aria-sort')).toBe('none');
  });

  it('writes the row selection into the shared workspace selection', async () => {
    const { user, selectionRef } = await renderDatasheet();
    await user.click(within(rowFor('N2')).getByRole('rowheader'));
    await waitFor(() => expect(selectionRef.current).toEqual({ kind: 'node', id: 'N2' }));
  });

  it('builds a multi selection that the existing bulk edit can consume', async () => {
    const { user, selectionRef } = await renderDatasheet();
    await user.click(within(rowFor('N1')).getByRole('rowheader'));
    await user.keyboard('{Control>}');
    await user.click(within(rowFor('N3')).getByRole('rowheader'));
    await user.keyboard('{/Control}');
    await waitFor(() => expect(selectionRef.current).toEqual({
      kind: 'multi', nodeIds: ['N1', 'N3'], memberIds: [],
    }));
  });

  it('marks the selected row without marking it as focused', async () => {
    const { user } = await renderDatasheet();
    await user.click(within(rowFor('N2')).getByRole('rowheader'));
    await waitFor(() => expect(rowFor('N2').getAttribute('aria-selected')).toBe('true'));
    expect(rowFor('N1').getAttribute('aria-selected')).toBe('false');
  });

  it('focuses the object on the canvas and closes itself in the same gesture', async () => {
    const user = setup();
    const onOpenChange = vi.fn();
    const focused = vi.fn();
    window.addEventListener(workspaceCommandEventName('focus-object'), focused);
    const Seeded = () => {
      const { project, replaceProject } = useProjectModel();
      if (project.id !== 'datasheet-fixture') {
        return <button type="button" onClick={() => replaceProject(createDatasheetProject())}>sembrar</button>;
      }
      return <DatasheetPanel open onOpenChange={onOpenChange} />;
    };
    render(<ProjectProvider><Seeded /></ProjectProvider>);
    await user.click(screen.getByRole('button', { name: 'sembrar' }));
    await screen.findByRole('grid');

    await user.click(screen.getByRole('button', { name: 'Enfocar' }));

    await waitFor(() => expect(focused).toHaveBeenCalled());
    const detail = (focused.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ kind: 'node', id: 'N1' });
    // El datasheet es modal: dejarlo abierto taparía el objeto recién centrado.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    window.removeEventListener(workspaceCommandEventName('focus-object'), focused);
  });

  it('previews the focused object without offering any way to write it', async () => {
    const { user } = await renderDatasheet();
    const context = screen.getByRole('complementary', { name: 'Detalle del objeto enfocado' });
    expect(within(context).getByRole('region', { name: 'Nodo' })).toBeTruthy();
    expect(within(context).getByRole('region', { name: 'Apoyo' })).toBeTruthy();
    expect(within(context).getByRole('region', { name: 'Carga' })).toBeTruthy();
    // «Enfocar» es la única acción; no hay ningún campo editable en la fase.
    expect(within(context).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(context).queryAllByRole('spinbutton')).toHaveLength(0);
    expect(within(context).getAllByRole('button').map((button) => button.textContent)).toEqual(['Enfocar']);

    await user.click(screen.getByRole('button', { name: /Barras/ }));
    const memberContext = screen.getByRole('complementary', { name: 'Detalle del objeto enfocado' });
    expect(within(memberContext).getByRole('region', { name: 'Material' })).toBeTruthy();
    expect(within(memberContext).getByRole('region', { name: 'Sección' })).toBeTruthy();
  });

  it('names the catalog section of a member and the equivalent one otherwise', async () => {
    const { user } = await renderDatasheet();
    await user.click(screen.getByRole('button', { name: /Barras/ }));
    const context = () => screen.getByRole('complementary', { name: 'Detalle del objeto enfocado' });
    expect(within(context()).getByText('W12x26')).toBeTruthy();

    await user.click(within(rowFor('M2')).getByRole('rowheader'));
    await waitFor(() => expect(within(context()).getByText('Sección equivalente')).toBeTruthy());
  });

  it('keeps the grid usable when nothing matches', async () => {
    const { user } = await renderDatasheet();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en la tabla' }), 'zzzz');
    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull());
    expect(screen.getByText('Ninguna fila coincide con la búsqueda y los filtros actuales.')).toBeTruthy();
  });
});
