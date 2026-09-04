// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useProject } from '../../store/ProjectContext';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { createEditorLayerState } from './editorLayers';
import { StructuralCanvas } from './StructuralCanvas';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeAll(() => vi.stubGlobal('ResizeObserver', ResizeObserverMock));

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  const project = createDefaultProject();
  project.nodes = [
    { id: 'N1', x: -2, y: -1, support: { type: 'none' } },
    { id: 'N2', x: 5, y: 6, support: { type: 'none' } },
    { id: 'N3', x: 9, y: 0, support: { type: 'none' } },
  ];
  project.members = [{ ...project.members[0], id: 'M1', i: 'N1', j: 'N2' }];
  project.nodalLoads = [];
  project.memberLoads = [];
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
});

afterEach(cleanup);

/**
 * Ancho en píxeles de la regla de escala. Es la lectura de cámara que sí cambia
 * al encajar: el rótulo («1 m») puede repetirse entre dos zooms distintos
 * porque siempre es un número redondo, pero su longitud en pantalla no.
 */
const scaleBarPixels = () => document.querySelector('.canvas-scale-bar')?.getAttribute('data-scale-bar-px') ?? '';

const numericAttributes = (selector: string, attributes: readonly string[]) => [...document.querySelectorAll<SVGElement>(selector)].flatMap((element) => (
  attributes.map((attribute) => ({ attribute, value: element.getAttribute(attribute) }))
));

const SupportHarness = () => {
  const { activeTool, project, setActiveTool } = useProject();
  const support = project.nodes.find((node) => node.id === 'N3')?.support.type ?? 'missing';
  return <>
    <button type="button" onClick={() => setActiveTool('support')}>activar apoyos</button>
    <output aria-label="herramienta soporte">{activeTool}</output>
    <output aria-label="apoyo N3">{support}</output>
    <StructuralCanvas layers={createEditorLayerState()} dispatchLayers={() => undefined} />
  </>;
};

describe('StructuralCanvas fit', () => {
  it('keeps the diagonal model rendered and finite when fit is activated from its accessible button', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><StructuralCanvas layers={createEditorLayerState()} dispatchLayers={() => undefined} /></ProjectProvider>);
    const beforeModel = localStorage.getItem(PROJECT_STORAGE_KEY);
    const initialScale = scaleBarPixels();

    await user.click(screen.getByRole('button', { name: 'Ajustar modelo a la vista' }));

    await waitFor(() => {
      expect(scaleBarPixels()).not.toBe(initialScale);
      expect(Number(scaleBarPixels())).toBeGreaterThan(0);
    });

    expect(document.querySelectorAll('[data-structure-kind="node"]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-structure-kind="member"] line.member-line')).toHaveLength(1);
    expect(numericAttributes('[data-structure-kind="node"] circle.node-dot', ['cx', 'cy'])
      .every(({ value }) => value !== null && Number.isFinite(Number(value)))).toBe(true);
    expect(numericAttributes('[data-structure-kind="member"] line.member-line', ['x1', 'y1', 'x2', 'y2'])
      .every(({ value }) => value !== null && Number.isFinite(Number(value)))).toBe(true);
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe(beforeModel);
  });

  it('opens an explicit support choice without cycling the node before confirmation', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><SupportHarness /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'activar apoyos' }));
    const node = document.querySelector<SVGGElement>('[data-structure-kind="node"][data-structure-id="N3"]');
    if (!node) throw new Error('No se encontró N3.');
    fireEvent.pointerDown(node, {
      pointerId: 7,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 320,
      clientY: 480,
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText('apoyo N3').textContent).toBe('none');
    await user.click(screen.getByRole('button', { name: 'Rodillo orientable' }));

    await waitFor(() => expect(screen.getByLabelText('apoyo N3').textContent).toBe('roller'));
    expect(screen.getByLabelText('herramienta soporte').textContent).toBe('select');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
