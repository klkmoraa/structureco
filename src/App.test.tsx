// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createBlankProject, createDefaultProject } from './data/defaultProject';
import { PROJECT_STORAGE_KEY } from './data/projectStorage';
import { InMemoryProjectRepository } from './storage/projectRepository';
import { readWelcomeEntry, shouldResumeDirectly } from './features/welcome/welcomeEntry';
import { buildShareLink } from './utils/shareLink';

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

/**
 * CRI-89 · La clase de composición del shell (`X2` | `M1` | `K0`) sale ÚNICA Y
 * EXCLUSIVAMENTE de `window.innerWidth`/`innerHeight`. Ningún componente
 * consulta ya `matchMedia` para decidir layout, así que fijar el viewport es la
 * única forma —y la misma que usa producción— de elegir composición desde una
 * prueba. Es el mismo helper que `ResultsPanel.test.tsx`.
 *
 * El defecto de jsdom (1024×768) cae por debajo de la frontera X2 calculada por
 * el presupuesto de lienzo (1117 px a 768 de alto), así que sin fijarlo la app
 * se monta en `M1` y las superficies auxiliares no se acoplan: ése era el
 * origen silencioso de buena parte de los fallos de este archivo.
 */
const setViewport = (viewport: 'desktop' | 'phone' = 'desktop') => {
  const [width, height] = viewport === 'phone' ? [390, 844] : [1440, 900];
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

/**
 * Aislamiento entre pruebas. La persistencia real del producto son DOS medios y
 * los dos se limpian aquí, sin inventar un tercero:
 *
 * - `localStorage` — el proyecto activo (`PROJECT_STORAGE_KEY`), el modelo de
 *   Space 3D y las preferencias del panel de resultados.
 * - **IndexedDB** — la biblioteca de proyectos y las copias `RecoveryRecord`
 *   que `ProjectHub` y `welcomeEntry` leen. jsdom NO implementa IndexedDB, así
 *   que hoy no hay base que borrar; el borrado se hace igualmente y de verdad
 *   si algún día la hubiera, para que este archivo no pueda empezar a depender
 *   en silencio de una base heredada de la prueba anterior.
 */
const clearPersistence = async () => {
  localStorage.clear();
  sessionStorage.clear();
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('structureCo.projects');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
};

beforeEach(async () => {
  setViewport('desktop');
  await clearPersistence();
  document.documentElement.dataset.theme = 'light';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  // Sigue haciendo falta para lo que jsdom no implementa y que NO es layout:
  // `prefers-color-scheme`, `prefers-reduced-motion` y `(hover: hover)`.
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

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await clearPersistence();
});

/**
 * El rediseño total sustituyó el onboarding de cuatro pasos por destinos
 * persistentes de producto. Esta ayuda recorre la navegación real y evita
 * que App.test.tsx vuelva a convertir Inicio en una puerta oculta.
 */
type HomeDestination = 'projects' | 'templates' | 'classroom' | 'import' | 'space3d';

const navigateHome = async (user: ReturnType<typeof userEvent.setup>, destination: HomeDestination) => {
  const labels: Record<HomeDestination, RegExp> = {
    projects: /proyectos|projects/i,
    templates: /plantillas|templates/i,
    classroom: /aula|classroom/i,
    import: /importar|import/i,
    space3d: /^space 3d$/i,
  };
  const sidebar = document.querySelector('.sc-home-sidebar') as HTMLElement;
  await user.click(within(sidebar).getByRole('button', { name: labels[destination] }));
};

const openWorkspace = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /continuar proyecto/i }));
  await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 5000 });
};

const renderExampleApp = async (user: ReturnType<typeof userEvent.setup>) => {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
  const result = render(<App />);
  await openWorkspace(user);
  return result;
};

/**
 * El menú de utilidades es el de la TopBar. Se acota al chrome global porque
 * las acciones contextuales del lienzo publican su propio desbordamiento con el
 * mismo rótulo (CRI-95/CRI-108): son dos dueños distintos y la prueba dice de
 * cuál habla, en vez de exigir que uno se renombre.
 */
const openUtilityMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  const topbar = within(document.querySelector('.topbar') as HTMLElement);
  await user.click(topbar.getByRole('button', { name: /herramientas del espacio de trabajo|workspace tools/i }));
  return screen.findByRole('dialog', { name: /herramientas del espacio de trabajo|workspace tools/i });
};

/**
 * CRI-94 / CRI-101 · Resultados es una superficie INVOCADA, no residente. Un
 * análisis exitoso pide automáticamente su resumen; este helper cubre los
 * demás flujos que la invocan de forma explícita desde la paleta.
 */
const openResults = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.keyboard('{Control>}k{/Control}');
  const palette = await screen.findByRole('dialog', { name: /paleta de comandos|command palette/i });
  await user.click(within(palette).getByRole('option', { name: /resultados: resumen|results: summary/i }));
  await waitFor(() => expect(document.querySelector('.results-panel')).toBeTruthy());
  const results = document.querySelector('.results-panel') as HTMLElement;
  // El comando conserva Resultados como superficie invocada, pero en desktop
  // queda recogida hasta que el usuario pide expandirla. La prueba abre ese
  // estado explícitamente antes de elegir una pestaña, si el control existe.
  const desktopToggle = within(results).queryByRole('button', { name: /abrir resultados|open results/i });
  if (!within(results).queryByRole('tab', { name: /momento|moment/i }) && desktopToggle) {
    await user.click(desktopToggle);
  }
  await user.click(await within(results).findByRole('tab', { name: /momento|moment/i }));
};

/**
 * CRI-101 · Reacciones, Influencia y «Aprender» dejaron de ser pestañas del
 * panel: son la superficie `dense`, que se pide desde sus lanzadores.
 */
const openDenseResults = async (user: ReturnType<typeof userEvent.setup>, view: 'reactions' | 'influence' | 'learn') => {
  const labels: Record<typeof view, RegExp> = {
    reactions: /reacciones|reactions/i,
    influence: /influencia|influence/i,
    learn: /aprender|learn/i,
  };
  const results = document.querySelector('.results-panel') as HTMLElement;
  // CRI-130 deja los tres destinos de lectura directamente en la barra de
  // cantidades: no hay un segundo menú que oculte Reacciones, Influencia o
  // Aprender. El selector se mantiene acotado al panel para no confundirlos
  // con la copia de la superficie densa una vez abierta.
  await user.click(within(results).getByRole('button', { name: labels[view] }));
  await waitFor(() => expect(document.querySelector('.dense-results-surface')).toBeTruthy(), { timeout: 5000 });
};

/**
 * CRI-103 · Los atajos de una sola letra sólo disparan con el foco DENTRO del
 * lienzo: en cualquier otro sitio secuestrarían la navegación rápida de un
 * lector de pantalla. Enfocar es ahora parte del contrato que se prueba.
 */
const focusCanvas = (canvas: HTMLElement) => {
  canvas.focus();
  expect(canvas.contains(document.activeElement)).toBe(true);
};

const confirmSpace3DEntry = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await screen.findByRole('dialog', { name: /abrir space 3d experimental|open experimental space 3d/i });
  await user.click(within(dialog).getByRole('button', { name: /abrir space 3d|open space 3d/i }));
};

describe('structureCo app shell', () => {
  it('routes a shared local link through review before replacing the current project', async () => {
    const shared = createDefaultProject();
    shared.name = 'Modelo compartido';
    const link = buildShareLink(shared, window.location.href);
    if (!link.ok) throw new Error('El modelo de prueba debe caber en un enlace');
    window.history.replaceState(null, '', new URL(link.url).pathname + new URL(link.url).hash);

    render(<App />);

    expect(await screen.findByRole('heading', { name: /contenido encontrado/i }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /importar ahora/i })).toBeNull();
    expect(window.location.hash).toBe('');
  });

  it('reaches Space 3D from the workspace top bar and keeps no other 3D surface', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /continuar proyecto/i }));
    await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 });
    expect(screen.queryByRole('button', { name: /experimental 3d/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /abrir space 3d/i }));
    await confirmSpace3DEntry(user);
    expect(await screen.findByRole('button', { name: 'Editor 2D' }, { timeout: 10_000 })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Editor 2D' }));
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
  }, 40_000);

  it('opens Space 3D lazily from start and returns to both destinations', async () => {
    const user = userEvent.setup();
    render(<App />);

    // El grafo de Space 3D no debe estar evaluado antes del clic.
    expect(document.querySelector('.space3d-screen')).toBeNull();

    // CRI-104 · su puerta desde Inicio vive en el paso «Por dónde», marcada
    // como experimental. Sigue existiendo; lo que cambió es por dónde se llega.
    await navigateHome(user, 'space3d');
    await user.click(screen.getByRole('button', { name: /abrir space 3d|open space 3d/i }));
    await confirmSpace3DEntry(user);
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
    expect(document.querySelector('.space3d-screen')).not.toBeNull();

    await user.click(screen.getAllByRole('button', { name: 'Editor 2D' })[0]);
    expect(await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 })).toBeTruthy();
    expect(document.querySelector('.space3d-screen')).toBeNull();

    await user.click(screen.getByRole('button', { name: /ir al inicio/i }));
    // Volver a Inicio restaura la portada real, con sus destinos persistentes.
    await screen.findByTestId('welcome-screen');
    await navigateHome(user, 'space3d');
    await user.click(await screen.findByRole('button', { name: /abrir space 3d|open space 3d/i }));
    await confirmSpace3DEntry(user);
    await user.click(await screen.findByRole('button', { name: 'Inicio' }));
    expect(await screen.findByTestId('welcome-screen')).toBeTruthy();
  }, 40_000);

  it('keeps the 2D project untouched while Space 3D stores its own model', async () => {
    const user = userEvent.setup();
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
    render(<App />);
    const before = localStorage.getItem(PROJECT_STORAGE_KEY);

    await navigateHome(user, 'space3d');
    await user.click(screen.getByRole('button', { name: /abrir space 3d|open space 3d/i }));
    await confirmSpace3DEntry(user);
    await screen.findByRole('button', { name: /^analizar$/i }, { timeout: 10_000 });
    await waitFor(() => expect(localStorage.getItem('structureco:space3d:v1')).toBeTruthy(), { timeout: 10_000 });

    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBe(before);
  }, 40_000);

  it('presents the total-redesign Home with work first, live Three artwork and no onboarding rail', async () => {
    render(<App />);
    expect(screen.getByTestId('welcome-screen')).toBeTruthy();

    expect(document.querySelector('.sc-home-wordmark strong')?.textContent).toBe('structureCo');
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeTruthy();

    expect(document.querySelector('.sc-home')).not.toBeNull();
    expect(document.querySelector('.welcome-steps')).toBeNull();
    expect(document.querySelectorAll('.sc-home-quick-row > button')).toHaveLength(3);

    expect(document.querySelector('.sc-home-hero')).not.toBeNull();
    expect(document.querySelector('[data-structural-render="three-prerender"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /nuevo proyecto/i })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: /proyectos recientes/i })).toBeTruthy();
  }, 10_000);

  it('opens a blank project from the work step and reaches the workspace', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /nuevo proyecto/i }));

    expect(await screen.findByRole('button', { name: /proyecto actual/i }, { timeout: 5000 })).toBeTruthy();
    expect(document.querySelector('.topbar-project-trigger strong')?.textContent).toBe('Proyecto sin título');
    expect(container.querySelectorAll('.node-object')).toHaveLength(0);
    expect(container.querySelectorAll('.member-object')).toHaveLength(0);
  }, 10_000);

  it('resets Results and its visual context when creating a project from another unit system', async () => {
    const user = userEvent.setup();
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
    render(<App />);
    await openWorkspace(user);

    const resultsLauncher = screen.getByRole('button', { name: 'Resultados' });
    await user.click(resultsLauncher);
    await waitFor(() => expect(resultsLauncher.getAttribute('aria-pressed')).toBe('true'));
    expect(document.querySelector('.results-panel')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Proyecto actual' }));
    await user.click(screen.getByRole('button', { name: 'Proyecto nuevo' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Proyecto actual' }).textContent).toContain('Proyecto sin título');
      expect(document.querySelector('.results-panel')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'Resultados' }).getAttribute('aria-pressed')).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Configuración de análisis' }));
    expect((screen.getByRole('combobox', { name: 'Unidades' }) as HTMLSelectElement).value).toBe('kN-m');
    expect((screen.getByRole('combobox', { name: 'Modo de cálculo' }) as HTMLSelectElement).value).toBe('complete');
  }, 15_000);

  it('keeps every product entry point reachable from Home navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await navigateHome(user, 'classroom');
    expect(screen.getByRole('button', { name: /crear desde cero|start from scratch/i })).toBeTruthy();

    await navigateHome(user, 'templates');
    expect(document.querySelectorAll('.sc-home-template-grid > button').length).toBeGreaterThan(0);

    await navigateHome(user, 'import');
    expect(screen.getByRole('button', { name: /importar archivo|import file/i })).toBeTruthy();

    await navigateHome(user, 'space3d');
    expect(screen.getByRole('button', { name: /abrir space 3d|open space 3d/i })).toBeTruthy();
  }, 15_000);

  it('localizes built-in example cards and preserves English when an example opens', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const { container } = render(<App />);

    await navigateHome(user, 'templates');
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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    render(<App />);

    await navigateHome(user, 'classroom');
    await user.click(screen.getByRole('button', { name: /start from scratch/i }));
    await user.click(screen.getByRole('radio', { name: /simply supported beam/i }));
    await user.click(screen.getByRole('button', { name: /create exercise/i }));

    expect(await screen.findByRole('button', { name: /^analyze$/i }, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^analizar$/i })).toBeNull();
  }, 10_000);

  it('renders the editor and runs analysis for an existing model', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);

    expect(document.querySelector('.topbar .brand-mark')).not.toBeNull();
    expect(screen.getByRole('button', { name: /^analizar$/i })).toBeTruthy();
    expect(document.querySelector('.topbar-project-trigger')?.textContent).toContain('Pórtico de ejemplo');

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));

    // Un cálculo nuevo invoca su resumen automáticamente y lo deja recogido en
    // desktop; la aserción espera el efecto que publica el resultado en vez de
    // competir con él en el mismo tick.
    await waitFor(() => expect(document.querySelector('.results-panel')).not.toBeNull());
    const results = document.querySelector('.results-panel') as HTMLElement;
    expect(results.classList.contains('desktop-collapsed')).toBe(true);
    expect(within(results).getByTestId('results-collapsed-status').textContent).toMatch(/resuelto.*actualizado/i);
    await user.click(within(results).getByRole('button', { name: /abrir resultados/i }));
    await user.click(await within(results).findByRole('tab', { name: /momento/i }));

    await screen.findByTestId('diagram-chart', {}, { timeout: 5_000 });

    expect(screen.queryByText(/No se generaron resultados/i)).toBeNull();
  }, 15_000);

  it('opens and closes Compact Results from the persistent top-bar control', async () => {
    setViewport('phone');
    const user = userEvent.setup();
    await renderExampleApp(user);
    const resultsLauncher = screen.getByRole('button', { name: 'Resultados' });

    await user.click(resultsLauncher);
    const results = await screen.findByRole('dialog', { name: /Resultados del análisis/i });
    expect(results.getAttribute('data-surface-status')).toBe('active');
    expect(resultsLauncher.getAttribute('aria-pressed')).toBe('true');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('.results-panel')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(resultsLauncher));
    expect(resultsLauncher.getAttribute('aria-pressed')).toBe('false');
  }, 15_000);

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
    // jsdom no implementa `inert` (`'inert' in HTMLElement.prototype === false`),
    // así que React lo escribe como propiedad expando y al desactivarlo la
    // BORRA: «no inerte» se lee aquí como `undefined`, no como `false`. Lo que
    // el producto debe garantizar —y lo que se afirma— es que el shell deja de
    // estar aislado; `aria-hidden` sí es un atributo real y se comprueba entero.
    expect(shell.inert).toBeFalsy();
    expect(shell.hasAttribute('aria-hidden')).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(doctorButton));
  });

  it('keeps a completed analysis while Model Doctor is opened and closed', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await openResults(user);
    await screen.findByTestId('diagram-chart', {}, { timeout: 5_000 });
    const diagramsBefore = screen.getAllByTestId('diagram-chart').length;

    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Model Doctor' })).toBeNull());
    expect(screen.getAllByTestId('diagram-chart')).toHaveLength(diagramsBefore);
  }, 15_000);

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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
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

    await user.click(screen.getByRole('button', { name: /proyecto actual/i }));
    const projectHub = await screen.findByRole('dialog', { name: /proyecto actual/i });
    await user.click(within(projectHub).getByRole('button', { name: /proyecto nuevo/i }));
    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    doctor = await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    noLoads = within(doctor).getByRole('article', { name: /sin cargas/i });
    expect(within(noLoads).queryByText(/reconocido para esta sesi/i)).toBeNull();
  });

  /**
   * CRI-89 · La composición Compact ya NO se simula con `matchMedia`: la clase
   * del shell sale del viewport de layout. Fingir la media query dejaba la app
   * montada en `M1` mientras la prueba creía estar en `K0`.
   */
  it('collapses expanded mobile Results before opening Model Doctor', async () => {
    setViewport('phone');
    const user = userEvent.setup();
    await renderExampleApp(user);
    expect(document.querySelector('.app-shell')?.getAttribute('data-shell-class')).toBe('K0');
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() =>
      expect(document.querySelector('.analysis-status-shell')?.getAttribute('data-analysis-status')).toBe('resolved'),
    );
    await openResults(user);
    const results = document.querySelector<HTMLElement>('.results-panel')!;
    expect(results.classList.contains('mobile-collapsed')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));

    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    await waitFor(() => expect(results.classList.contains('mobile-collapsed')).toBe(true));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement)
      .toBe(screen.getByRole('button', { name: 'Model Doctor' })));
  });

  it('only announces Model Doctor findings after an explicit analysis request', async () => {
    const user = userEvent.setup();
    const project = createDefaultProject();
    project.nodalLoads = [];
    project.memberLoads = [];
    project.loadCases = project.loadCases.map((loadCase) => ({ ...loadCase, selfWeightFactor: 0 }));
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    render(<App />);
    await openWorkspace(user);

    // Un proyecto importado o editado puede tener hallazgos, pero abrir el
    // workspace no debe interrumpirlo: el diagnóstico manual sigue disponible.
    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    const doctor = await screen.findByRole('dialog', { name: 'Model Doctor' });
    expect(within(doctor).getByRole('article', { name: /sin cargas/i })).toBeTruthy();
    expect(screen.queryByText('Model Doctor encontró problemas')).toBeNull();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    expect(await screen.findByText('Model Doctor encontró problemas')).toBeTruthy();
    expect(screen.getByText(/Abre Model Doctor para revisarlos/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /configuración de análisis/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Unidades' }), { target: { value: 'N-mm' } });

    await waitFor(() => expect(screen.getAllByText('Model Doctor encontró problemas')).toHaveLength(1));
  });

  it('reports mixed reactions as separate Rx and Ry components', async () => {
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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    render(<App />);
    await openWorkspace(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    // CRI-101 · «Reacciones» vive en la superficie densa. La tabla conserva
    // componentes independientes para que una resultante no oculte su signo.
    await openResults(user);
    const evidence = screen.getByRole('group', { name: /evidencia|evidence/i });
    await user.click(within(evidence).getByRole('button', { name: /momento|moment/i }));
    await openDenseResults(user, 'reactions');

    await waitFor(() => expect(document.querySelector('.dense-results-surface table')).toBeTruthy());
    const table = document.querySelector('.dense-results-surface table') as HTMLTableElement;
    expect(within(table).getByRole('columnheader', { name: /Rx \(kN\)/ })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: /Ry \(kN\)/ })).toBeTruthy();
    const rowA = within(table).getByRole('row', { name: /^A\b/ });
    const cellsA = rowA.querySelectorAll('td');
    expect(Number(cellsA[3].textContent)).toBeCloseTo(-20, 3);
    expect(Number(cellsA[4].textContent)).toBeCloseTo(30, 3);
    const rowB = within(table).getByRole('row', { name: /^B\b/ });
    const cellsB = rowB.querySelectorAll('td');
    expect(Number(cellsB[3].textContent)).toBeCloseTo(0, 3);
    expect(Number(cellsB[4].textContent)).toBeCloseTo(10, 3);
  }, 15_000);

  it('creates a guided classroom exercise and analyzes it without prediction gates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateHome(user, 'classroom');
    await user.click(screen.getByRole('button', { name: /crear desde cero/i }));
    await user.click(screen.getByRole('radio', { name: /viga simplemente apoyada/i }));
    await user.click(screen.getByRole('button', { name: /crear ejercicio/i }));

    expect((await screen.findByRole('button', { name: /proyecto actual/i })).textContent).toContain('Viga simplemente apoyada');
    expect(screen.getAllByText(/modo aula/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    // CRI-95 · el estado del análisis vive ahora en la TopBar y su afirmación
    // es «Análisis actualizado»: `success` sin prometer `reliable` ni `safe`.
    // «Resultados resueltos» era la copia del panel anterior y ya no la escribe
    // nadie.
    await waitFor(() => expect(screen.getAllByText(/análisis actualizado/i).length).toBeGreaterThan(0), { timeout: 2500 });
    expect(screen.queryByRole('heading', { name: /tu hipótesis antes del cálculo/i })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /signo esperado/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /revelar y comparar/i })).toBeNull();

    // CRI-101 · «Aprender» ya no es una pestaña residente: es la vista `learn`
    // de la superficie densa, que se invoca desde su lanzador.
    await openResults(user);
    await openDenseResults(user, 'learn');
    expect(await screen.findByRole('button', { name: 'Fundamentos' }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Procedimiento' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verificación' })).toBeTruthy();
  }, 20_000);

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
    await user.click(screen.getByRole('button', { name: /analysis settings/i }));
    expect(screen.getAllByRole('combobox', { name: /load case or combination/i }).length).toBeGreaterThan(0);
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) ?? '{}');
      expect(saved.settings?.language).toBe('en');
    });
  });

  it('highlights the objects related to an open learning step', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await openResults(user);
    await openDenseResults(user, 'learn');
    // La superficie densa se monta en un portal, fuera del contenedor de
    // render; el resaltado que se mide sigue estando en el lienzo, dentro.
    let firstStep: Element | null = null;
    await waitFor(() => {
      firstStep = document.querySelector('.learning-steps summary');
      expect(firstStep).toBeTruthy();
    }, { timeout: 5000 });
    await user.click(firstStep!);
    await waitFor(() => expect(container.querySelectorAll('.learning-highlight').length).toBeGreaterThan(0));
  }, 20_000);

  it('shows the N–V–M cursor and learning levels', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await openResults(user);
    await waitFor(() => expect(screen.getByTestId('diagram-chart')).toBeTruthy());
    expect(screen.getByText(/Cursor exacto N–V–M/i)).toBeTruthy();

    await openDenseResults(user, 'learn');
    const detailGroup = await screen.findByRole('group', { name: /nivel de detalle/i }, { timeout: 5000 });
    expect(detailGroup).toBeTruthy();
    await user.click(within(detailGroup).getByRole('button', { name: 'Completo' }));
    expect(within(detailGroup).getByRole('button', { name: 'Completo' }).classList.contains('active')).toBe(true);
  }, 20_000);

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

  it('keeps selection actions in the Inspector while repeat remains accessible', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const member = container.querySelector('.member-object');
    expect(member).toBeTruthy();

    await user.click(member!);
    expect(container.querySelector('[data-contextual-actions]')).toBeNull();
    const repeat = screen.getByRole('button', { name: /repetir/i });
    expect(repeat.getAttribute('data-repeat-affordance')).toBe('available');
    expect(repeat.getAttribute('aria-keyshortcuts')).toBe('R');

    await user.click(repeat);
    const preview = screen.getByRole('status', { name: /repetición preparada/i });
    expect(preview.getAttribute('data-repeat-affordance')).toBe('active');
    expect(within(preview).getByRole('button', { name: /cancelar colocación/i })).toBeTruthy();
  });

  it('keeps Compact free of duplicate selection, repeat, and anonymous floating controls', async () => {
    setViewport('phone');
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const member = container.querySelector('.member-object');
    expect(member).toBeTruthy();

    await user.click(member!);

    expect(container.querySelector('[data-contextual-actions]')).toBeNull();
    expect(container.querySelector('[data-repeat-affordance]')).toBeNull();
    expect(container.querySelector('.mobile-inspector-toggle')).toBeNull();

    const more = within(container.querySelector('.mobile-tool-dock') as HTMLElement)
      .getByRole('button', { name: /más herramientas/i });
    await user.click(more);
    const palette = await screen.findByRole('dialog', { name: /más herramientas/i });
    await user.click(within(palette).getByRole('menuitem', { name: /editar selección/i }));

    await waitFor(() => expect(document.querySelector('[data-structural-edit-surface]')).toBeTruthy());
    // La superficie reclama el foco en un `requestAnimationFrame` posterior a
    // su montaje: afirmarlo en el mismo tick medía el reloj del runner.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('ΔX')));
  });

  it('exposes canvas shortcuts and selects structural objects from the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const canvas = screen.getByRole('application', { name: /área de trabajo estructural/i });
    const member = screen.getByRole('button', { name: /miembro M1, de N1 a N3/i });

    expect(canvas.getAttribute('data-pointer-support')).toBe('mouse touch pen');
    expect(canvas.getAttribute('aria-keyshortcuts')).toContain('Delete');
    expect(member.getAttribute('aria-keyshortcuts')).toBe('Enter Space');

    // CRI-103 · un atajo de UNA letra sólo dispara con el foco dentro del
    // lienzo; con el foco en el `body` debe quedarse quieto para no secuestrar
    // la navegación rápida de un lector de pantalla. Se afirman las dos mitades.
    fireEvent.keyDown(canvas, { key: 'h', code: 'KeyH' });
    expect(screen.getByRole('button', { name: /desplazar \(H\)/i }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.keyDown(member, { key: 'Enter', code: 'Enter' });
    expect(member.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-structure-id="M1"] .member-selection-halo')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(member.getAttribute('aria-pressed')).toBe('false');

    focusCanvas(canvas);
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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
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
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /continue project/i }));
    await screen.findByRole('button', { name: /^analyze$/i }, { timeout: 5000 });
    const canvas = screen.getByRole('application', { name: /structural workspace/i });

    expect(screen.getByRole('button', { name: /Member M1, from N1 to N3/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Node N1, X 0\.000, Y 0\.000/ })).toBeTruthy();
    expect(container.querySelector('.load-symbol, .distributed-symbol')?.getAttribute('aria-label')).not.toMatch(/Carga|Momento/);

    focusCanvas(canvas);
    fireEvent.keyDown(canvas, { key: 'n', code: 'KeyN' });
    const cad = await screen.findByRole('form', { name: 'CAD numeric entry' }, { timeout: 5000 });
    expect(within(cad).getByText('Node by coordinates')).toBeTruthy();
    await user.click(within(cad).getByRole('button', { name: 'Create node' }));
    expect(screen.getByRole('alert').textContent).toContain('Enter two valid numeric values.');

    await user.click(screen.getByRole('button', { name: /^analyze$/i }));
    await openResults(user);
    const chart = await screen.findByTestId('diagram-chart', {}, { timeout: 5000 });
    const chartGraphic = within(chart).getByRole('img');
    expect(chartGraphic.getAttribute('aria-label')).toMatch(/Bending moment diagram/i);
    expect(chartGraphic.getAttribute('aria-label')).not.toMatch(/Diagrama de momento/i);
    const evidence = screen.getByRole('group', { name: 'Evidence' });
    await user.click(within(evidence).getByRole('button', { name: 'Moment' }));
    await waitFor(() => expect(container.querySelector('.canvas-result-legend')).toBeTruthy());
    expect(container.querySelector('.canvas-result-legend')?.getAttribute('aria-label')).toBe('Diagram convention');
    expect(container.querySelector('.canvas-result-legend')?.textContent).toContain('Exact curve');
    expect(container.querySelector('.canvas-result-legend')?.textContent).not.toMatch(/Curva exacta|por miembro|común/);
  }, 20_000);

  it('renames a project without invalidating completed analysis', async () => {
    const user = userEvent.setup();
    await renderExampleApp(user);
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await openResults(user);
    await screen.findByTestId('diagram-chart');
    await user.click(screen.getByRole('button', { name: /proyecto actual/i }));
    const name = await screen.findByRole('textbox', { name: /nombre del proyecto/i });
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
  }, 20_000);

  /**
   * CRI-104 · Quién está entrando se deriva del REPOSITORIO, no de una
   * preferencia inventada: `listProjects()` y `listRecoveries()`, las dos
   * lecturas que `ProjectHub` ya hacía. Escribir `localStorage` no convierte a
   * nadie en usuario recurrente, y esta prueba lo fija para que ninguna prueba
   * futura vuelva a fingirlo por ahí.
   *
   * La derivación se ejercita con `InMemoryProjectRepository`, que es la
   * implementación de `ProjectRepository` que el propio producto expone para
   * esto (la misma que usan `ProjectHub.test.tsx` y `welcomeFlow.test.tsx`):
   * no hay mock, ni parche de `listProjects`, ni bypass del repositorio.
   */
  describe('returning user', () => {
    it('derives a returning user from saved projects, and resumes directly', async () => {
      const repository = new InMemoryProjectRepository();
      await repository.saveProject({ ...createDefaultProject(), name: 'Trabajo de ayer' });

      const entry = await readWelcomeEntry(repository);
      expect(entry.status).toBe('returning');
      expect(entry.projects).toBe(1);
      expect(shouldResumeDirectly(entry)).toBe(true);
    });

    it('does not call the empty project the app saves on first launch a library', async () => {
      const repository = new InMemoryProjectRepository();
      // Es exactamente lo que `ProjectProvider` persiste en el primer arranque,
      // antes de que el usuario haya dibujado nada.
      await repository.saveProject(createBlankProject());

      const entry = await readWelcomeEntry(repository);
      expect(entry).toEqual({ status: 'new', projects: 0, recoveries: 0 });
      expect(shouldResumeDirectly(entry)).toBe(false);
    });

    it('never auto-skips while a recovery copy is pending', async () => {
      const repository = new InMemoryProjectRepository();
      const project = { ...createDefaultProject(), name: 'Trabajo protegido' };
      await repository.saveProject(project);
      await repository.createRecovery(project, 'conflict');

      const entry = await readWelcomeEntry(repository);
      expect(entry.status).toBe('returning');
      expect(entry.recoveries).toBe(1);
      // La recuperación vive en la Bienvenida: saltársela escondería trabajo
      // protegido, que es el riesgo que CRI-104 marca como inaceptable.
      expect(shouldResumeDirectly(entry)).toBe(false);
    });

    it('treats a stored project in localStorage as a new user, and keeps the welcome', async () => {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
      render(<App />);

      // El proyecto activo de `localStorage` NO es una biblioteca: sin
       // repositorio (jsdom no implementa IndexedDB) el usuario es nuevo y la
       // portada editorial se conserva visible.
       expect(await readWelcomeEntry()).toEqual({ status: 'new', projects: 0, recoveries: 0 });
       expect(await screen.findByTestId('welcome-screen')).toBeTruthy();
       expect(document.querySelector('.sc-home')).not.toBeNull();
       expect(document.querySelectorAll('.sc-home-quick-row > button')).toHaveLength(3);
    });

    it('keeps Home reachable from the workspace', async () => {
      const user = userEvent.setup();
      await renderExampleApp(user);

      await user.click(screen.getByRole('button', { name: /ir al inicio/i }));

      const welcome = await screen.findByTestId('welcome-screen');
      expect(welcome).toBeTruthy();
      expect(document.querySelector('.sc-home-hero')).not.toBeNull();
      expect(screen.getByRole('button', { name: /nuevo proyecto/i })).toBeTruthy();
    }, 15_000);
  });

  /**
   * CRI-94 sustituyó «el inspector móvil es modal» por un vocabulario explícito:
   * sólo `drawer` y `fullscreen` son modales; una `sheet` CONVIVE con el
   * trabajo. En `K0` el Inspector es `sheet`, así que no aísla el shell y el
   * lienzo —donde sigue el foco— conserva sus atajos. Lo que esta prueba
   * afirmaba de verdad (un atajo del lienzo no dispara bajo una superficie que
   * aísla) se comprueba contra la superficie que HOY sí es modal en `K0`:
   * Model Doctor, presentado a pantalla completa.
   */
  it('keeps the Compact inspector sheet coexisting, and blocks canvas shortcuts only under a modal surface', async () => {
    setViewport('phone');
    const user = userEvent.setup();
    const { container } = await renderExampleApp(user);
    const shell = container.querySelector<HTMLElement>('.app-shell')!;
    const member = container.querySelector('.member-object');
    expect(member).toBeTruthy();
    await user.click(member!);
    const before = container.querySelectorAll('.member-object').length;

    // 1 · En Compact el Inspector tiene una ruta con nombre en Utilidades;
    // no depende de un botón flotante que se pierda debajo del dock.
    const utilities = screen.getByRole('button', { name: /herramientas del espacio de trabajo/i });
    await user.click(utilities);
    await user.click(screen.getByRole('button', { name: /mostrar inspector/i }));
    await screen.findByRole('dialog', { name: /inspector/i });
    expect(shell.inert).toBeFalsy();
    expect(shell.hasAttribute('aria-hidden')).toBe(false);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /inspector/i })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(utilities));
    expect(container.querySelectorAll('.member-object')).toHaveLength(before);

    // 2 · Bajo una superficie MODAL el fondo sí queda aislado y el atajo del
    // lienzo no llega: ni borra ni abre la paleta.
    await user.click(member!);
    await user.click(screen.getByRole('button', { name: 'Model Doctor' }));
    await screen.findByRole('dialog', { name: 'Model Doctor' }, { timeout: 5000 });
    expect(shell.inert).toBe(true);
    expect(shell.getAttribute('aria-hidden')).toBe('true');

    await user.keyboard('{Delete}');
    expect(container.querySelectorAll('.member-object')).toHaveLength(before);
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog', { name: /paleta de comandos/i })).toBeNull();
  }, 20_000);
});
