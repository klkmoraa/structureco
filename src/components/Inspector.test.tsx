// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../data/projectStorage';
import { ClassroomSessionProvider } from '../store/ClassroomSessionContext';
import { ProjectProvider, useProject } from '../store/ProjectContext';
import type { ProjectModel, Selection, UnitSystemId } from '../types';
import { Inspector } from './Inspector';

const ADVANCED_STORAGE_KEY = 'structureCo.inspector.expanded.v1';

const createInspectorProject = (calculationMode: 'complete' | 'classroom' = 'complete'): ProjectModel => {
  const project = createDefaultProject();
  project.settings = { ...project.settings, calculationMode };
  project.members.push({
    id: 'MR',
    i: 'N1',
    j: 'N2',
    type: 'rigid',
    E: 1,
    A: 1,
    I: 1,
  });
  project.memberLoads.push(
    {
      id: 'ML2',
      memberId: 'M1',
      caseId: 'LC1',
      type: 'point',
      coordinateSystem: 'global',
      lengthBasis: 'real',
      start: 0,
      end: 1,
      position: 0.375,
      px: 5,
      py: -12.5,
    },
    {
      id: 'ML3',
      memberId: 'M3',
      caseId: 'LC1',
      type: 'moment',
      coordinateSystem: 'local',
      lengthBasis: 'real',
      start: 0,
      end: 1,
      position: 0.25,
      moment: 8.75,
    },
  );
  return project;
};

const selections: Array<{ label: string; value: Selection }> = [
  { label: 'Quitar selección', value: null },
  { label: 'Seleccionar nodo N3', value: { kind: 'node', id: 'N3' } },
  { label: 'Seleccionar nodo N4', value: { kind: 'node', id: 'N4' } },
  { label: 'Seleccionar apoyo N1', value: { kind: 'node', id: 'N1' } },
  { label: 'Seleccionar miembro M1', value: { kind: 'member', id: 'M1' } },
  { label: 'Seleccionar vínculo rígido MR', value: { kind: 'member', id: 'MR' } },
  { label: 'Seleccionar carga nodal NL1', value: { kind: 'nodalLoad', id: 'NL1' } },
  { label: 'Seleccionar carga distribuida ML1', value: { kind: 'memberLoad', id: 'ML1' } },
  { label: 'Seleccionar carga puntual ML2', value: { kind: 'memberLoad', id: 'ML2' } },
  { label: 'Seleccionar momento ML3', value: { kind: 'memberLoad', id: 'ML3' } },
  {
    label: 'Seleccionar varios objetos',
    value: { kind: 'multi', nodeIds: ['N1', 'N3'], memberIds: ['M1'] },
  },
];

const InspectorHarness = ({ modal = false, onClose }: { modal?: boolean; onClose?: () => void }) => {
  const {
    project,
    selection,
    setSelection,
    analyze,
    canUndo,
    canRedo,
    undo,
    redo,
    updateProjectView,
  } = useProject();
  const nodeN3 = project.nodes.find((node) => node.id === 'N3');
  const nodeN4 = project.nodes.find((node) => node.id === 'N4');
  const memberM1 = project.members.find((member) => member.id === 'M1');

  return <ClassroomSessionProvider projectId={project.id}>
    <div>
      <div aria-label="Controles de prueba">
        {selections.map((item) => <button key={item.label} type="button" onClick={() => setSelection(item.value)}>{item.label}</button>)}
        <button type="button" onClick={analyze}>Analizar fixture</button>
        <button type="button" onClick={undo}>Deshacer fixture</button>
        <button type="button" onClick={redo}>Rehacer fixture</button>
        <label>Cambiar unidades fixture<select value={project.settings.units} onChange={(event) => updateProjectView((draft) => {
          draft.settings.units = event.target.value as UnitSystemId;
          return draft;
        })}><option value="kN-m">kN-m</option><option value="N-mm">N-mm</option><option value="kgf-m">kgf-m</option><option value="kip-ft">kip-ft</option></select></label>
      </div>
      <output aria-label="Selección actual">{selection?.kind ?? 'none'}</output>
      <output aria-label="Puede deshacer">{String(canUndo)}</output>
      <output aria-label="Puede rehacer">{String(canRedo)}</output>
      <output aria-label="N3 X almacenada">{String(nodeN3?.x)}</output>
      <output aria-label="N3 Y almacenada">{String(nodeN3?.y)}</output>
      <output aria-label="N4 X almacenada">{String(nodeN4?.x)}</output>
      <output aria-label="M1 E almacenado">{String(memberM1?.E)}</output>
      <Inspector modal={modal} onClose={onClose} />
    </div>
  </ClassroomSessionProvider>;
};

const renderInspector = (
  project: ProjectModel = createInspectorProject(),
  props: { modal?: boolean; onClose?: () => void } = {},
) => {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
  return render(<ProjectProvider><InspectorHarness {...props} /></ProjectProvider>);
};

const storedNumber = (label: string) => Number(screen.getByLabelText(label).textContent);

const expectDescribedUnit = (input: HTMLElement, expectedUnit: string) => {
  const describedBy = input.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? [];
  expect(describedBy.some((id) => document.getElementById(id)?.textContent === expectedUnit)).toBe(true);
};

const selectionSummary = () => screen.getByRole('region', { name: 'Resumen de selección' });

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Inspector selection variants', () => {
  it('renders the empty selection and Inspector navigation with accessible semantics', () => {
    renderInspector();

    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeTruthy();
    const inspectorTab = screen.getByRole('tab', { name: 'Inspector' });
    expect(inspectorTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Cargas' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Vista' })).toBeTruthy();

    const summary = selectionSummary();
    expect(within(summary).getByText('Nada seleccionado')).toBeTruthy();
    expect(within(summary).getByText('—')).toBeTruthy();
    expect(screen.getByText('Selecciona un objeto para ver sus propiedades, unidades y resultados derivados.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Propiedades frecuentes' })).toBeNull();
  });

  it('distinguishes a free node from a support and exposes units plus calculated values', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));
    let summary = selectionSummary();
    expect(within(summary).getByText('Nodo')).toBeTruthy();
    expect(within(summary).getByText('N3')).toBeTruthy();
    expect(within(summary).getByText('Nodo libre · coordenadas editables')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Propiedades frecuentes' })).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Apoyo' }) as HTMLSelectElement).value).toBe('none');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'X' }), 'm');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Y' }), 'm');
    expect(screen.getAllByText('Calculado').length).toBeGreaterThan(0);
    expect(screen.getByText('Identificador del modelo')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Seleccionar apoyo N1' }));
    summary = selectionSummary();
    expect(within(summary).getByText('Apoyo')).toBeTruthy();
    expect(within(summary).getByText('N1')).toBeTruthy();
    expect(within(summary).getByText('Articulado · nodo estructural')).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Apoyo' }) as HTMLSelectElement).value).toBe('pin');
  });

  it('renders editable and derived member properties, and clearly locks a rigid link', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Seleccionar miembro M1' }));
    expect(within(selectionSummary()).getByText('Miembro')).toBeTruthy();
    expect(within(selectionSummary()).getByText('M1')).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Elemento' }) as HTMLSelectElement).value).toBe('frame');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'E' }), 'MPa');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'A' }), 'm²');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'I' }), 'm⁴');
    expect(screen.getByText('Longitud')).toBeTruthy();
    expect(screen.getByText('Ángulo')).toBeTruthy();
    expect(screen.getAllByText('Calculado').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Seleccionar vínculo rígido MR' }));
    expect(within(selectionSummary()).getByText('Vínculo rígido · N1 → N2')).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Elemento' }) as HTMLSelectElement).value).toBe('rigid');
    expect(screen.queryByRole('textbox', { name: 'E' })).toBeNull();
    expect(screen.getByText('Sin propiedades de rigidez editables')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Propiedades avanzadas' }));
    expect(screen.getByText('Propiedades mecánicas bloqueadas')).toBeTruthy();
    expect(screen.getByText(/compatibilidad cinemática exacta/)).toBeTruthy();
  });

  it('covers nodal, distributed, point, and moment load property variants with visible units', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Seleccionar carga nodal NL1' }));
    expect(within(selectionSummary()).getByText('Carga puntual')).toBeTruthy();
    expect(within(selectionSummary()).getByText('NL1')).toBeTruthy();
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Horizontal Fx' }), 'kN');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Vertical Fy' }), 'kN');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Momento Mz' }), 'kN·m');
    expect(screen.getAllByText('Calculado').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Seleccionar carga distribuida ML1' }));
    expect(within(selectionSummary()).getByText('Carga distribuida')).toBeTruthy();
    expect(within(selectionSummary()).getByText('ML1')).toBeTruthy();
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Desde' }), 'x/L');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Hasta' }), 'x/L');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'qy al inicio' }), 'kN/m');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'qy al final' }), 'kN/m');

    await user.click(screen.getByRole('button', { name: 'Seleccionar carga puntual ML2' }));
    expect(within(selectionSummary()).getByText('Carga puntual')).toBeTruthy();
    expect(within(selectionSummary()).getByText('ML2')).toBeTruthy();
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Posición' }), 'x/L');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Fuerza X' }), 'kN');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Fuerza Y' }), 'kN');

    await user.click(screen.getByRole('button', { name: 'Seleccionar momento ML3' }));
    expect(within(selectionSummary()).getByText('Momento')).toBeTruthy();
    expect(within(selectionSummary()).getByText('ML3')).toBeTruthy();
    expectDescribedUnit(screen.getByRole('textbox', { name: 'Posición' }), 'x/L');
    expectDescribedUnit(screen.getByRole('textbox', { name: 'M' }), 'kN·m');
  });

  it('makes multiple selection read-only and explains why bulk editing is locked', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Seleccionar varios objetos' }));
    const summary = selectionSummary();
    expect(within(summary).getByText('Selección múltiple')).toBeTruthy();
    expect(within(summary).getByText('3 objetos')).toBeTruthy();
    expect(screen.getByText('2 nodos · 1 miembros')).toBeTruthy();
    expect(screen.getByText('Edición masiva bloqueada')).toBeTruthy();
    expect(screen.getByText(/evitar cambios físicos ambiguos/)).toBeTruthy();
    expect(screen.getAllByText('Calculado').length).toBeGreaterThan(0);
    const panel = screen.getByRole('tabpanel', { name: 'Inspector' });
    expect(within(panel).queryByRole('textbox')).toBeNull();
    expect(within(panel).queryByRole('combobox')).toBeNull();
  });
});

describe('Inspector editing safety and history', () => {
  it('does not mutate the project or create undo history on focus and blur alone', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));

    const input = screen.getByRole('textbox', { name: 'Y' });
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(storedNumber('N3 Y almacenada')).toBe(4);
    expect(screen.getByLabelText('Puede deshacer').textContent).toBe('false');
  });

  it('changes all visible unit systems without changing stored precision or undo history', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));
    const unitSelector = screen.getByRole('combobox', { name: 'Cambiar unidades fixture' });
    const cases: Array<[UnitSystemId, string, string]> = [
      ['N-mm', '4000', 'mm'],
      ['kgf-m', '4', 'm'],
      ['kip-ft', '13.1234', 'ft'],
      ['kN-m', '4', 'm'],
    ];

    for (const [system, displayValue, unit] of cases) {
      await user.selectOptions(unitSelector, system);
      const input = screen.getByRole('textbox', { name: 'Y' }) as HTMLInputElement;
      await waitFor(() => expect(input.value).toBe(displayValue));
      expectDescribedUnit(input, unit);
      expect(storedNumber('N3 Y almacenada')).toBe(4);
      expect(screen.getByLabelText('Puede deshacer').textContent).toBe('false');
    }
  });

  it('keeps blank and malformed drafts inline without coercing stored state to zero', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));
    const input = screen.getByRole('textbox', { name: 'Y' }) as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(storedNumber('N3 Y almacenada')).toBe(4);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-errormessage')).toBe(`${input.id}-error`);
    expect(screen.getByRole('alert').textContent).toBe('Este campo no puede quedar vacío.');
    expect(screen.getByLabelText('Puede deshacer').textContent).toBe('false');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(storedNumber('N3 Y almacenada')).toBe(4);
    expect(screen.getByRole('alert').textContent).toBe('Ingresa un número válido.');
    expect(screen.getByLabelText('Puede deshacer').textContent).toBe('false');
  });

  it('drops an uncommitted draft when selection changes instead of leaking stale data', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));
    const input = screen.getByRole('textbox', { name: 'X' }) as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar nodo N4' }));

    await waitFor(() => expect((screen.getByRole('textbox', { name: 'X' }) as HTMLInputElement).value).toBe('6'));
    expect(storedNumber('N3 X almacenada')).toBe(0);
    expect(storedNumber('N4 X almacenada')).toBe(6);
    expect(screen.getByLabelText('Puede deshacer').textContent).toBe('false');
  });

  it('commits exact valid input once and preserves it through undo and redo', async () => {
    const user = userEvent.setup();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar nodo N3' }));
    const input = screen.getByRole('textbox', { name: 'Y' }) as HTMLInputElement;
    const exact = 4.123456789012345;

    await user.click(input);
    await user.clear(input);
    await user.type(input, String(exact));
    await user.keyboard('{Enter}');

    expect(storedNumber('N3 Y almacenada')).toBe(exact);
    expect(input.value).toBe('4.12346');
    expect(screen.getByLabelText('Puede deshacer').textContent).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Deshacer fixture' }));
    expect(storedNumber('N3 Y almacenada')).toBe(4);
    expect(screen.getByLabelText('Puede rehacer').textContent).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Rehacer fixture' }));
    expect(storedNumber('N3 Y almacenada')).toBe(exact);
  });
});

describe('Inspector advanced, locked, and validation states', () => {
  it('persists advanced-property accordion state in localStorage across remounts', async () => {
    const user = userEvent.setup();
    const first = renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar miembro M1' }));
    let advanced = screen.getByRole('button', { name: 'Propiedades avanzadas' });
    expect(advanced.getAttribute('aria-expanded')).toBe('false');
    const controlledPanelId = advanced.getAttribute('aria-controls');
    expect(controlledPanelId).toBeTruthy();
    expect(document.getElementById(controlledPanelId ?? '')?.hidden).toBe(true);

    await user.click(advanced);
    expect(advanced.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(controlledPanelId ?? '')?.hidden).toBe(false);
    expect(JSON.parse(localStorage.getItem(ADVANCED_STORAGE_KEY) ?? '[]')).toContain('advanced-member');

    first.unmount();
    renderInspector();
    await user.click(screen.getByRole('button', { name: 'Seleccionar miembro M1' }));
    advanced = screen.getByRole('button', { name: 'Propiedades avanzadas' });
    expect(advanced.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(advanced.getAttribute('aria-controls') ?? '')?.hidden).toBe(false);
  });

  it('locks material and advanced mechanics in classroom mode without hiding stored values', async () => {
    const user = userEvent.setup();
    renderInspector(createInspectorProject('classroom'));
    await user.click(screen.getByRole('button', { name: 'Seleccionar miembro M1' }));

    expect(screen.getByText('Material bloqueado en modo Aula')).toBeTruthy();
    expect(screen.getByText(/E, A e I conservan los valores actuales/)).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'E' })).toBeNull();
    expect(storedNumber('M1 E almacenado')).toBe(200e6);

    await user.click(screen.getByRole('button', { name: 'Propiedades avanzadas' }));
    expect(screen.getByText('Propiedades avanzadas bloqueadas en modo Aula')).toBeTruthy();
    expect(screen.getByText('Semirrigidez y offsets bloqueados')).toBeTruthy();
  });

  it('surfaces existing domain validation issues for the selected object with ARIA alerts', async () => {
    const user = userEvent.setup();
    const project = createInspectorProject();
    const member = project.members.find((item) => item.id === 'M1');
    if (member) member.E = 0;
    renderInspector(project);
    await user.click(screen.getByRole('button', { name: 'Seleccionar miembro M1' }));
    await user.click(screen.getByRole('button', { name: 'Analizar fixture' }));

    const issues = await screen.findByRole('region', { name: 'Validaciones del objeto' });
    expect(within(issues).getByRole('heading', { name: 'Validación del análisis' })).toBeTruthy();
    const alert = within(issues).getByRole('alert');
    expect(alert.textContent).toContain('Módulo elástico inválido');
    expect(alert.textContent).toContain('E del miembro M1 debe ser mayor que cero.');
  });

  it('uses dialog semantics, traps keyboard focus, and closes safely with Escape in modal mode', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderInspector(createInspectorProject(), { modal: true, onClose });

    expect(screen.getByRole('dialog', { name: 'Inspector' }).getAttribute('aria-modal')).toBe('true');
    const first = screen.getByRole('tab', { name: 'Inspector' });
    const last = screen.getByRole('button', { name: 'Cerrar inspector' });
    await waitFor(() => expect(document.activeElement).toBe(first));

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('traps focus against the active tab and ignores controls inside closed details', async () => {
    const user = userEvent.setup();
    renderInspector(createInspectorProject(), { modal: true, onClose: vi.fn() });

    const inspectorTab = screen.getByRole('tab', { name: 'Inspector' });
    await waitFor(() => expect(document.activeElement).toBe(inspectorTab));
    await user.keyboard('{ArrowRight}');

    const loadsTab = screen.getByRole('tab', { name: 'Cargas' });
    await waitFor(() => expect(document.activeElement).toBe(loadsTab));
    expect(loadsTab.getAttribute('aria-selected')).toBe('true');
    const closedDetails = [...document.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
    expect(closedDetails.length).toBeGreaterThan(0);
    const lastSummary = closedDetails.at(-1)?.querySelector('summary');
    expect(lastSummary).toBeTruthy();

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(lastSummary);
    await user.tab();
    expect(document.activeElement).toBe(loadsTab);
  });
});
