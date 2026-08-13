// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createDefaultProject } from './data/defaultProject';

// El visor real necesita WebGL, que jsdom no ofrece. Se sustituye el viewport
// por un doble inerte para poder ejercitar la navegación y la superficie.
vi.mock('./space3d/view/threeViewport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./space3d/view/threeViewport')>()),
  createSpace3DViewport: () => ({
    scene: {} as never,
    camera: {} as never,
    controlsTarget: {} as never,
    setModel: vi.fn(),
    setLayers: vi.fn(),
    setView: vi.fn(),
    zoomBy: vi.fn(),
    resize: vi.fn(),
    render: vi.fn(),
    requestRender: vi.fn(),
    pickAt: () => null,
    dispose: vi.fn(),
  }),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  if (!globalThis.crypto.randomUUID) {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000000' });
  }
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'light';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const openWorkspace = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /continuar proyecto/i }));
  await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 5000 });
};

const renderExampleApp = async (user: ReturnType<typeof userEvent.setup>) => {
  localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
  const result = render(<App />);
  await openWorkspace(user);
  return result;
};

const openUtilityMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /más acciones/i }));
  return screen.findByRole('dialog', { name: /más acciones/i });
};

describe('structureCo app shell', () => {
  it('reaches Space 3D from the workspace top bar and keeps no other 3D surface', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continuar proyecto/i }));
    await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 });
    expect(screen.queryByRole('button', { name: /experimental 3d/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /abrir space 3d/i }));
    expect(await screen.findByRole('button', { name: 'Editor 2D' }, { timeout: 10_000 })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Editor 2D' }));
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
  }, 40_000);

  it('opens Space 3D lazily from start and returns to both destinations', async () => {
    const user = userEvent.setup();
    render(<App />);

    // El grafo de Space 3D no debe estar evaluado antes del clic.
    expect(document.querySelector('.space3d-screen')).toBeNull();

    await user.click(screen.getByRole('button', { name: /space 3d/i }));
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
    expect(document.querySelector('.space3d-screen')).not.toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Editor 2D' })[0]);
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
    expect(document.querySelector('.space3d-screen')).toBeNull();

    await user.click(screen.getByRole('button', { name: /ir al inicio/i }));
    await user.click(await screen.findByRole('button', { name: /space 3d/i }));
    await user.click(await screen.findByRole('button', { name: 'Inicio' }));
    expect(await screen.findByTestId('welcome-screen')).toBeTruthy();
  }, 40_000);

  it('keeps the 2D project untouched while Space 3D stores its own model', async () => {
    const user = userEvent.setup();
    localStorage.setItem('structureCo.project', JSON.stringify(createDefaultProject()));
    render(<App />);
    const before = localStorage.getItem('structureCo.project');

    await user.click(screen.getByRole('button', { name: /space 3d/i }));
    await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 });
    await waitFor(() => expect(localStorage.getItem('structureco:space3d:v1')).toBeTruthy(), { timeout: 10_000 });

    expect(localStorage.getItem('structureCo.project')).toBe(before);
  }, 40_000);

  it('shows a start screen and opens a blank project on demand', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /analiza estructuras con claridad/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /nuevo ejercicio/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /proyecto completo/i })).toBeTruthy();
    expect(screen.getByText(/importar archivo/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /proyecto completo/i }));

    expect(await screen.findByDisplayValue('Proyecto sin título', {}, { timeout: 5000 })).toBeTruthy();
    expect(container.querySelectorAll('.node-object')).toHaveLength(0);
    expect(container.querySelectorAll('.member-object')).toHaveLength(0);
  }, 10_000);

  it('localizes built-in example cards and preserves English when an example opens', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    const { container } = render(<App />);

    const exampleFrame = screen.getByRole('button', { name: /Example frame.*6 × 4 m frame/ });
    expect(exampleFrame).toBeTruthy();
    expect(screen.getByRole('button', { name: /Simply supported beam.*8 m beam/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Triangular truss.*statically determinate truss/i })).toBeTruthy();
    const cards = [...container.querySelectorAll('.welcome-template-card')].map((card) => card.textContent).join(' ');
    expect(cards).not.toMatch(/Pórtico de ejemplo|Viga simplemente apoyada|Armadura triangular/);

    await user.click(exampleFrame);
    expect(await screen.findByRole('button', { name: /^analyze$/i }, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^analizar$/i })).toBeNull();
  }, 10_000);

  it('preserves English when creating a guided exercise', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /new exercise/i }));
    await user.click(screen.getByRole('radio', { name: /simply supported beam/i }));
    await user.click(screen.getByRole('button', { name: /create exercise/i }));

    expect(await screen.findByRole('button', { name: /^analyze$/i }, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^analizar$/i })).toBeNull();
  }, 10_000);

  it('renders the editor and runs analysis for an existing model', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);

    expect(screen.getByText('structureCo')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^analizar$/i })).toBeTruthy();
    expect(screen.getByDisplayValue('Pórtico de ejemplo')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Diagrama de momento flector/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    expect(screen.queryByText(/No se generaron resultados/i)).toBeNull();
  });

  it('opens Model Doctor before analysis, isolates the workspace, and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const doctorButton = screen.getByRole('button', { name: 'Model Doctor' });

    await user.click(doctorButton);

    expect(await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 })).toBeTruthy();
    const shell = container.querySelector<HTMLElement>('.app-shell')!;
    expect(shell.inert).toBe(true);
    expect(shell.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByTestId('diagram-chart')).toBeNull();

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog', { name: /paleta de comandos/i })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Model Doctor' })).toBeTruthy();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Model Doctor' })).toBeNull());
    expect(shell.inert).toBe(false);
    expect(shell.hasAttribute('aria-hidden')).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(doctorButton));
  });

  it('keeps a completed analysis while Model Doctor is opened and closed', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Diagrama de momento flector/i).length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    const diagramsBefore = screen.getAllByText(/Diagrama de momento flector/i).length;

    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Model Doctor' })).toBeNull());
    expect(screen.getAllByText(/Diagrama de momento flector/i)).toHaveLength(diagramsBefore);
  });

  it('returns focus through the complete keyboard launcher path', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);
    const analyzeButton = screen.getByRole('button', { name: /^analizar$/i });
    analyzeButton.focus();

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog', { name: /paleta de comandos/i }, { timeout: 5000 })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /paleta de comandos/i })).toBeNull());
    analyzeButton.focus();

    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', { name: /paleta de comandos/i }, { timeout: 5000 });
    await user.click(within(palette).getByRole('option', { name: /Model Doctor/i }));
    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Model Doctor' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(analyzeButton));
  });

  it('keeps acknowledgement across a real unmount but resets it for a replacement project', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.nodalLoads = [];
    project.memberLoads = [];
    project.loadCases = project.loadCases.map((loadCase) => ({ ...loadCase, selfWeightFactor: 0 }));
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    render(<App />);
    await openWorkspace(user);

    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    let doctor = await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    let noLoads = within(doctor).getByRole('article', { name: /sin cargas/i });
    await user.click(within(noLoads).getByRole('button', { name: /reconocer/i }));
    expect(within(noLoads).getByText(/reconocido para esta sesi/i)).toBeTruthy();
    await user.click(within(doctor).getByRole('button', { name: /cerrar model doctor/i }));

    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    doctor = await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    expect(within(doctor).getByText(/reconocido para esta sesi/i)).toBeTruthy();
    await user.click(within(doctor).getByRole('button', { name: /cerrar model doctor/i }));

    await user.click(screen.getByRole('button', { name: /abrir proyectos y ejemplos/i }));
    await user.click(within(screen.getByRole('menu', { name: /abrir proyectos y ejemplos/i }))
      .getByRole('menuitem', { name: /proyecto nuevo/i }));
    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    doctor = await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    noLoads = within(doctor).getByRole('article', { name: /sin cargas/i });
    expect(within(noLoads).queryByText(/reconocido para esta sesi/i)).toBeNull();
  });

  it('collapses expanded mobile Results before opening Model Doctor', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1023px)' || query === '(max-width: 700px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();
    await renderExampleApp(user);
    const resultsToggle = screen.getByRole('button', { name: 'Resultados' });
    await user.click(resultsToggle);
    const results = document.querySelector<HTMLElement>('.results-panel')!;
    expect(results.classList.contains('mobile-collapsed')).toBe(false);

    const menu = await openUtilityMenu(user);
    await user.click(within(menu).getByRole('button', { name: 'Model Doctor' }));

    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    await waitFor(() => expect(results.classList.contains('mobile-collapsed')).toBe(true));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /más acciones/i })));
  });

  it('shows one Model Doctor toast for a new diagnosis and does not repeat it while unchanged', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.nodalLoads = [];
    project.memberLoads = [];
    project.loadCases = project.loadCases.map((loadCase) => ({ ...loadCase, selfWeightFactor: 0 }));
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    render(<App />);
    await openWorkspace(user);

    expect(await screen.findByText('Model Doctor encontró problemas')).toBeTruthy();
    expect(screen.getByText(/Abre Model Doctor para revisarlos/i)).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox', { name: 'Unidades' }), { target: { value: 'N-mm' } });

    await waitFor(() => expect(screen.getAllByText('Model Doctor encontró problemas')).toHaveLength(1));
  });

  it('draws mixed reactions as separate horizontal Rx and vertical Ry arrows', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.name = 'Viga con reacciones mixtas';
    project.nodes = [
      { id: 'A', x: 0, y: 0, support: { type: 'pin' } },
      { id: 'B', x: 8, y: 0, support: { type: 'roller', angleDeg: 90 } },
    ];
    project.members = [{
      id: 'AB', i: 'A', j: 'B', type: 'frame', E: 200e6, A: 0.01, I: 8e-5,
      releases: { iMoment: true, jMoment: true },
    }];
    project.loadCases = [{ id: 'LC1', name: 'Caso mixto', category: 'variable', active: true, selfWeightFactor: 0 }];
    project.combinations = [];
    project.nodalLoads = [];
    project.memberLoads = [{
      id: 'P', memberId: 'AB', caseId: 'LC1', type: 'point', coordinateSystem: 'global', lengthBasis: 'real',
      start: 0, end: 1, position: 0.25, px: 20, py: -40,
    }];
    localStorage.setItem('structureCo.project', JSON.stringify(project));

    const { container } = render(<App />);
    await openWorkspace(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await user.click(await screen.findByRole('tab', { name: /^reacciones$/i }));

    await waitFor(() => expect(container.querySelector('.reaction-symbol[data-node-id="A"]')).toBeTruthy());
    const reaction = container.querySelector('.reaction-symbol[data-node-id="A"]')!;
    const rx = reaction.querySelector('line[data-reaction-component="rx"]')!;
    const ry = reaction.querySelector('line[data-reaction-component="ry"]')!;

    expect(rx.getAttribute('y1')).toBe(rx.getAttribute('y2'));
    expect(rx.getAttribute('x1')).not.toBe(rx.getAttribute('x2'));
    expect(ry.getAttribute('x1')).toBe(ry.getAttribute('x2'));
    expect(ry.getAttribute('y1')).not.toBe(ry.getAttribute('y2'));
    expect(reaction.textContent).toContain('Rx = -20.000 kN');
    expect(reaction.textContent).toContain('Ry = 30.000 kN');
    expect(reaction.textContent).not.toContain('R = 36.056 kN');

    const reactionB = container.querySelector('.reaction-symbol[data-node-id="B"]')!;
    expect(reactionB.querySelector('line[data-reaction-component="rx"]')).toBeNull();
    expect(reactionB.querySelector('line[data-reaction-component="ry"]')).toBeTruthy();
  });

  it('creates a guided classroom exercise and analyzes it without prediction gates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /nuevo ejercicio/i }));
    await user.click(screen.getByRole('radio', { name: /viga simplemente apoyada/i }));
    await user.click(screen.getByRole('button', { name: /crear ejercicio/i }));

    expect(await screen.findByDisplayValue('Viga simplemente apoyada')).toBeTruthy();
    expect(screen.getAllByText(/modo aula/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getAllByText(/resultados resueltos/i).length).toBeGreaterThan(0), { timeout: 2500 });
    expect(screen.queryByRole('heading', { name: /tu hipótesis antes del cálculo/i })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /signo esperado/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /revelar y comparar/i })).toBeNull();

    await user.click(screen.getByRole('tab', { name: /^aprender$/i }));
    expect(await screen.findByRole('button', { name: 'Fundamentos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Procedimiento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verificación' })).toBeTruthy();
  }, 10_000);

  it('changes between light and dark themes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openWorkspace(user);
    const menu = await openUtilityMenu(user);
    const button = within(menu).getByRole('button', { name: /tema oscuro/i });
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('changes the primary controls language and saves it in the project', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openWorkspace(user);
    const menu = await openUtilityMenu(user);
    await user.selectOptions(within(menu).getByRole('combobox', { name: /idioma/i }), 'en');

    expect(screen.getByRole('button', { name: /^analyze$/i })).toBeTruthy();
    expect(screen.getAllByRole('combobox', { name: /load case or combination/i }).length).toBeGreaterThan(0);
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('structureCo.project') ?? '{}');
      expect(saved.settings?.language).toBe('en');
    });
  });

  it('highlights the objects related to an open learning step', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getByRole('tab', { name: /aprender/i })).toBeTruthy());
    await user.click(screen.getByRole('tab', { name: /aprender/i }));
    let firstStep: Element | null = null;
    await waitFor(() => {
      firstStep = container.querySelector('.learning-steps summary');
      expect(firstStep).toBeTruthy();
    });
    await user.click(firstStep!);
    await waitFor(() => expect(container.querySelectorAll('.learning-highlight').length).toBeGreaterThan(0));
  });

  it('shows the N–V–M cursor and learning levels', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getByTestId('diagram-chart')).toBeTruthy());
    expect(screen.getByText(/Cursor exacto N–V–M/i)).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /aprender/i }));
    const detailGroup = await screen.findByRole('group', { name: /nivel de detalle/i });
    expect(detailGroup).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Completo' }));
    expect(screen.getByRole('button', { name: 'Completo' }).classList.contains('active')).toBe(true);
  }, 15_000);

  it('duplicates and copy-pastes members with fresh identifiers', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const initial = container.querySelectorAll('.member-object').length;
    const firstMember = container.querySelector('.member-object');
    expect(firstMember).toBeTruthy();
    await user.click(firstMember!);
    await user.keyboard('{Control>}d{/Control}');
    expect(screen.getByLabelText(/duplicar selección/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /confirmar duplicado/i }));
    await waitFor(() => expect(container.querySelectorAll('.member-object').length).toBe(initial + 1));
    await user.keyboard('{Control>}c{/Control}');
    await user.keyboard('{Control>}v{/Control}');
    await waitFor(() => expect(container.querySelectorAll('.member-object').length).toBe(initial + 2));
  });

  it('presents repeat as an accessible contextual canvas action', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const member = container.querySelector('.member-object');
    expect(member).toBeTruthy();

    await user.click(member!);
    const repeat = screen.getByRole('button', { name: /repetir/i });
    expect(repeat.getAttribute('data-repeat-affordance')).toBe('available');
    expect(repeat.getAttribute('aria-keyshortcuts')).toBe('R');

    await user.click(repeat);
    const preview = screen.getByRole('status', { name: /repetición preparada/i });
    expect(preview.getAttribute('data-repeat-affordance')).toBe('active');
    expect(within(preview).getByRole('button', { name: /cancelar colocación/i })).toBeTruthy();
  });

  it('exposes canvas shortcuts and selects structural objects from the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const canvas = screen.getByRole('application', { name: /área de trabajo estructural/i });
    const member = screen.getByRole('button', { name: /miembro M1, de N1 a N3/i });

    expect(canvas.getAttribute('data-pointer-support')).toBe('mouse touch pen');
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Delete');
    expect(member.getAttribute('aria-keyshortcuts')).toBe('Enter Space');

    fireEvent.keyDown(member, { key: 'Enter', code: 'Enter' });
    expect(member.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-structure-id="M1"] .member-selection-halo')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(member.getAttribute('aria-pressed')).toBe('false');

    fireEvent.keyDown(canvas, { key: 'h', code: 'KeyH' });
    expect(screen.getByRole('button', { name: /desplazar \(H\)/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps touch pan intent ahead of the overlap picker on a structural node', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const canvas = screen.getByRole('application', { name: /área de trabajo estructural/i });
    const node = screen.getByRole('button', { name: /nodo N1, X 0\.000, Y 0\.000/i });
    const member = screen.getByRole('button', { name: /miembro M1, de N1 a N3/i });
    const originalElementsFromPoint = document.elementsFromPoint;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [node, member],
    });

    try {
      fireEvent.pointerDown(node, {
        pointerId: 2,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: 120,
        clientY: 160,
      });

      expect(canvas.getAttribute('data-interaction')).toBe('pending');
      expect(container.querySelector('.selection-overlap-picker')).toBeNull();
    } finally {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: originalElementsFromPoint,
      });
    }
  });

  it('keeps touch selection disabled for object kinds excluded by the selection filter', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.settings = {
      ...project.settings,
      selectionFilter: { nodes: false, members: true, loads: true },
    };
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    const { container } = render(<App />);
    await openWorkspace(user);
    const canvas = screen.getByRole('application', { name: /área de trabajo estructural/i });
    const node = screen.getByRole('button', { name: /nodo N1, X 0\.000, Y 0\.000/i });

    fireEvent.pointerDown(node, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 120,
      clientY: 160,
    });
    fireEvent.pointerUp(node, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: 120,
      clientY: 160,
    });

    expect(canvas.getAttribute('data-interaction')).toBe('idle');
    expect(node.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-structure-id="N1"] .node-selection-halo')).toBeNull();
  });

  it('localizes canvas object names, CAD entry, feedback, and result legend in English', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    localStorage.setItem('structureCo.project', JSON.stringify(project));
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /continue project/i }));
    await screen.findByRole('button', { name: /^analyze$/i }, { timeout: 5000 });
    const canvas = screen.getByRole('application', { name: /structural workspace/i });

    expect(screen.getByRole('button', { name: /Member M1, from N1 to N3/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Node N1, X 0\.000, Y 0\.000/ })).toBeTruthy();
    expect(container.querySelector('.load-symbol, .distributed-symbol')?.getAttribute('aria-label')).not.toMatch(/Carga|Momento/);

    fireEvent.keyDown(canvas, { key: 'n', code: 'KeyN' });
    const cad = screen.getByRole('form', { name: 'CAD numeric entry' });
    expect(within(cad).getByText('Node by coordinates')).toBeTruthy();
    await user.click(within(cad).getByRole('button', { name: 'Create node' }));
    expect(screen.getByRole('alert').textContent).toContain('Enter two valid numeric values.');

    await user.click(screen.getByRole('button', { name: /^analyze$/i }));
    await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    expect(container.querySelector('.canvas-result-legend')?.getAttribute('aria-label')).toBe('Diagram convention');
    expect(container.querySelector('.canvas-result-legend')?.textContent).toContain('Exact curve');
    expect(container.querySelector('.canvas-result-legend')?.textContent).not.toMatch(/Curva exacta|por miembro|común/);
  }, 10_000);

  it('renames a project without invalidating completed analysis', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await screen.findByTestId('diagram-chart');
    const name = screen.getByRole('textbox', { name: /nombre del proyecto/i });
    await user.clear(name);
    await user.type(name, 'Marco principal');
    await user.tab();
    expect(screen.getByTestId('diagram-chart')).toBeTruthy();
    const menu = await openUtilityMenu(user);
    await user.selectOptions(within(menu).getByRole('combobox', { name: /idioma/i }), 'en');
    expect(screen.getByTestId('diagram-chart')).toBeTruthy();
    // Misma holgura que el resto de recorridos que montan la app, analizan y
    // luego teclean: es el test más pesado del archivo y con el timeout por
    // defecto de 5 s vivía al borde bajo carga de suite completa.
  }, 10_000);

  it('does not run canvas shortcuts while the mobile inspector is modal', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const member = container.querySelector('.member-object');
    expect(member).toBeTruthy();
    await user.click(member!);
    const before = container.querySelectorAll('.member-object').length;
    fireEvent.click(container.querySelector('.mobile-inspector-toggle')!);
    await screen.findByRole('dialog', { name: /inspector/i });
    await user.keyboard('{Delete}');
    expect(container.querySelectorAll('.member-object')).toHaveLength(before);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /inspector/i })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(container.querySelector('.mobile-inspector-toggle')));
  });
});
