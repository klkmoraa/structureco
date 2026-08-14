import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectProvider } from '../../store/ProjectContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import type { ProjectModel, Selection } from '../../types';
import { DatasheetPanel } from './DatasheetPanel';
import { createDatasheetProject } from './datasheetFixtures';
import type { DatasheetEntity } from './datasheetModel';

/**
 * Montaje compartido del datasheet sobre providers **reales**.
 *
 * No se sustituye `ProjectProvider` por un doble: lo que estas pruebas tienen
 * que demostrar es justamente que la hoja escribe por el historial normal del
 * proyecto, y con un store falso esa afirmación no valdría nada. Por eso el
 * arnés expone `undo`: una sola deshecha que devuelve el modelo entero es la
 * prueba de que el plan entró como una única entrada.
 */

const ENTITY_LABELS: Record<DatasheetEntity, RegExp> = {
  nodes: /^Nudos/,
  members: /^Barras/,
  loads: /^Cargas/,
};

/**
 * Estable a propósito: un `onOpenChange` en línea cambia de identidad en cada
 * render y el efecto de foco del Drawer volvería a llevarse el foco a su botón
 * de cerrar en mitad de una secuencia de teclas.
 */
const keepOpen = () => {};

interface HarnessProps {
  onProject: (project: ProjectModel) => void;
  onSelection: (selection: Selection) => void;
  onUndo: (undo: () => void) => void;
}

const Harness = ({ onProject, onSelection, onUndo }: HarnessProps) => {
  const { project, replaceProject, undo } = useProjectModel();
  const { selection } = useWorkspaceUI();
  onProject(project);
  onSelection(selection);
  onUndo(undo);
  if (project.id !== 'datasheet-fixture') {
    return <button type="button" onClick={() => replaceProject(createDatasheetProject())}>sembrar</button>;
  }
  return <DatasheetPanel open onOpenChange={keepOpen} />;
};

export interface RenderDatasheetOptions {
  entity?: DatasheetEntity;
}

export const renderDatasheet = async ({ entity = 'nodes' }: RenderDatasheetOptions = {}) => {
  const user = userEvent.setup({ delay: null });
  const projectRef = { current: null as ProjectModel | null };
  const selectionRef = { current: null as Selection };
  const undoRef = { current: (() => {}) as () => void };

  render(
    <ProjectProvider>
      <Harness
        onProject={(project) => { projectRef.current = project; }}
        onSelection={(selection) => { selectionRef.current = selection; }}
        onUndo={(undo) => { undoRef.current = undo; }}
      />
    </ProjectProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'sembrar' }));
  await screen.findByRole('grid');
  if (entity !== 'nodes') {
    // Se busca dentro del grupo de entidades: «Cargas» es también el rótulo de
    // una columna, y un `getByRole` global encontraría dos botones.
    const tabs = screen.getByRole('group', { name: 'Tipo de objeto' });
    await user.click(within(tabs).getByRole('button', { name: ENTITY_LABELS[entity] }));
  }

  return {
    user,
    selectionRef,
    grid: () => screen.getByRole('grid'),
    currentProject: () => projectRef.current as ProjectModel,
    undo: () => undoRef.current(),
  };
};

/** Celda con el foco itinerante de la rejilla. */
export const focusedCell = () => document.querySelector('[data-datasheet-focused="true"]') as HTMLElement;

export const cellAt = (rowId: string, columnIndex: number): HTMLElement => {
  const row = screen.getByRole('rowheader', { name: rowId }).closest('tr') as HTMLElement;
  return [...row.querySelectorAll('th, td')][columnIndex] as HTMLElement;
};

/**
 * Pega un bloque anclado en una celda.
 *
 * Primero se pulsa la celda, porque el ancla del pegado es el **foco de la
 * rejilla** y no la celda del evento: dispararlo sin mover el foco anclaría el
 * bloque donde estuviera antes, que es justo el fallo que esto debe descartar.
 *
 * El portapapeles de jsdom no transporta `text/plain`, así que el evento lleva
 * su `clipboardData` explícito. Lo que se prueba es el manejador de la rejilla,
 * no la implementación del portapapeles del navegador.
 */
export const pasteInto = async (
  user: ReturnType<typeof userEvent.setup>,
  cell: HTMLElement,
  text: string,
) => {
  await user.click(cell);
  const body = cell.closest('tbody') as HTMLElement;
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  body.dispatchEvent(event);
};
