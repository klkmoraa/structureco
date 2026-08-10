// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Space3DWorkspace from './Space3DWorkspace';
import type { Space3DViewport } from '../../space3d/view/threeViewport';
import type { Space3DStorageLike } from '../../space3d/data/storage';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

class MemoryStorage implements Space3DStorageLike {
  readonly map = new Map<string, string>();
  getItem(key: string) { return this.map.get(key) ?? null; }
  setItem(key: string, value: string) { this.map.set(key, value); }
  removeItem(key: string) { this.map.delete(key); }
}

const stubViewport = (): Space3DViewport => ({
  scene: {} as Space3DViewport['scene'],
  camera: {} as Space3DViewport['camera'],
  controlsTarget: {} as Space3DViewport['controlsTarget'],
  setModel: () => {},
  setLayers: () => {},
  setView: () => {},
  zoomBy: () => {},
  resize: () => {},
  render: () => {},
  requestRender: () => {},
  pickAt: () => null,
  dispose: () => {},
});

beforeAll(() => vi.stubGlobal('ResizeObserver', ResizeObserverMock));
afterEach(() => cleanup());

const renderWorkspace = (language: 'es' | 'en' = 'es') => {
  const storage = new MemoryStorage();
  const view = render(<Space3DWorkspace
    language={language}
    storage={storage}
    createViewport={stubViewport}
    onOpenHome={() => {}}
    onOpen2D={() => {}}
  />);
  return { storage, view };
};

const table = (name: RegExp) => screen.getByRole('table', { name });

describe('Space3DWorkspace end to end', () => {
  it('crea un nudo con coordenada Z y lo publica en la tabla', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.clear(screen.getByLabelText(/^x$/i));
    await user.type(screen.getByLabelText(/^x$/i), '1.5');
    await user.clear(screen.getByLabelText(/^z$/i));
    await user.type(screen.getByLabelText(/^z$/i), '3');
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));

    const row = within(table(/nudos/i)).getByRole('row', { name: /N5/ });
    expect(row).toBeDefined();
    expect(row.textContent).toContain('3');
  });

  it('rechaza un valor vacío o no numérico sin crear la entidad', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.clear(screen.getByLabelText(/^y$/i));
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    expect(screen.getAllByText(/escribe un número finito/i).length).toBeGreaterThan(0);
    expect(within(table(/nudos/i)).queryByRole('row', { name: /N5/ })).toBeNull();
  });

  it('crea una barra eligiendo extremos existentes', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.clear(screen.getByLabelText(/^x$/i));
    await user.type(screen.getByLabelText(/^x$/i), '6');
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));

    await user.click(screen.getByRole('button', { name: /nueva barra/i }));
    await user.selectOptions(screen.getByLabelText(/extremo i/i), 'N4');
    await user.selectOptions(screen.getByLabelText(/extremo j/i), 'N5');
    await user.click(screen.getByRole('button', { name: /guardar barra/i }));

    expect(within(table(/barras/i)).getByRole('row', { name: /M4/ })).toBeDefined();
  });

  it('fija los seis apoyos de un nudo desde el editor', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(within(table(/nudos/i)).getByRole('button', { name: /N4/ }));
    await user.click(screen.getByRole('button', { name: /empotrar/i }));
    for (const dof of ['ux', 'uy', 'uz', 'rx', 'ry', 'rz']) {
      expect((screen.getByLabelText(dof) as HTMLInputElement).checked).toBe(true);
    }
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    expect(within(table(/nudos/i)).getByRole('row', { name: /N4/ }).textContent).toMatch(/6/);
  });

  it('analiza el modelo y publica desplazamientos, reacciones y esfuerzos', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getByTestId('space3d-analysis-state').textContent).toBe('ready'));

    await user.click(screen.getByRole('tab', { name: /resultados/i }));
    await user.click(screen.getByRole('tab', { name: /^nudos$/i }));
    const nodeRow = within(table(/desplazamiento/i)).getByRole('row', { name: /N4/ });
    expect(nodeRow.textContent).toMatch(/-?\d/);

    await user.click(screen.getByRole('tab', { name: /^barras$/i }));
    expect(within(table(/acciones de extremo/i)).getByRole('row', { name: /M1/ })).toBeDefined();
  });

  it('marca el resultado como obsoleto al editar y oculta la deformada', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getByTestId('space3d-analysis-state').textContent).toBe('ready'));

    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    expect(screen.getByTestId('space3d-analysis-state').textContent).toBe('stale');
    expect(screen.getByTestId('space3d-deformed-visible').textContent).toBe('false');
    expect(screen.getAllByText(/obsoleto/i).length).toBeGreaterThan(0);
  });

  it('informa un mecanismo sin perder el modelo', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    for (const id of ['N1', 'N2', 'N3']) {
      await user.click(within(table(/nudos/i)).getByRole('button', { name: new RegExp(id) }));
      await user.click(screen.getByRole('button', { name: /liberar/i }));
      await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    }
    await user.click(screen.getByRole('button', { name: /^analizar$/i }));
    await waitFor(() => expect(screen.getByTestId('space3d-analysis-state').textContent).toBe('failed'));
    expect(screen.getAllByText(/mecanismo/i).length).toBeGreaterThan(0);
    expect(within(table(/nudos/i)).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('exporta e importa el proyecto conservando los valores', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: /^exportar$/i }));
    const portable = (screen.getByLabelText(/proyecto exportado/i) as HTMLTextAreaElement).value;
    expect(portable).toContain('"analysisSpace": "space-3d"');
    await user.click(screen.getByRole('button', { name: /cerrar/i }));

    await user.click(screen.getByRole('button', { name: /proyecto vacío/i }));
    expect(within(table(/nudos/i)).queryAllByRole('row')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^importar$/i }));
    const field = screen.getByLabelText(/proyecto a importar/i);
    await user.click(field);
    await user.paste(portable);
    await user.click(screen.getByRole('button', { name: /importar proyecto/i }));

    expect(within(table(/nudos/i)).getByRole('row', { name: /N4/ }).textContent).toContain('3.2');
  });

  it('deshace y rehace la última edición', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    expect(within(table(/nudos/i)).getByRole('row', { name: /N5/ })).toBeDefined();

    await user.click(screen.getByRole('button', { name: /deshacer/i }));
    expect(within(table(/nudos/i)).queryByRole('row', { name: /N5/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /rehacer/i }));
    expect(within(table(/nudos/i)).getByRole('row', { name: /N5/ })).toBeDefined();
  });

  it('persiste el proyecto en su propia clave y lo recupera al remontar', async () => {
    const user = userEvent.setup();
    const { storage, view } = renderWorkspace();
    await user.click(screen.getByRole('button', { name: /nuevo nodo/i }));
    await user.click(screen.getByRole('button', { name: /guardar nodo/i }));
    await waitFor(() => expect(storage.getItem('structureco:space3d:v1')).toContain('N5'));

    view.unmount();
    render(<Space3DWorkspace language="es" storage={storage} createViewport={stubViewport} />);
    expect(within(table(/nudos/i)).getByRole('row', { name: /N5/ })).toBeDefined();
  });

  it('alterna capas de la escena sin romper la superficie', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const grid = screen.getByRole('button', { name: /rejilla/i });
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    await user.click(grid);
    expect(screen.getByRole('button', { name: /rejilla/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('traduce la superficie completa al inglés', () => {
    renderWorkspace('en');
    expect(screen.getByRole('button', { name: /new node/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^analyse$/i })).toBeDefined();
    expect(screen.getByRole('table', { name: /nodes/i })).toBeDefined();
    expect(screen.queryByText(/Nuevo nodo/)).toBeNull();
  });

  it('expone destinos de navegación accesibles', async () => {
    const user = userEvent.setup();
    const home = vi.fn();
    const editor = vi.fn();
    render(<Space3DWorkspace
      language="es"
      storage={new MemoryStorage()}
      createViewport={stubViewport}
      onOpenHome={home}
      onOpen2D={editor}
    />);
    await user.click(screen.getByRole('button', { name: /inicio/i }));
    await user.click(screen.getByRole('button', { name: /editor 2d/i }));
    expect(home).toHaveBeenCalled();
    expect(editor).toHaveBeenCalled();
  });
});
