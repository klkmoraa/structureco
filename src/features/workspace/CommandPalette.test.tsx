// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { ProjectProvider, useProject } from '../../store/ProjectContext';
import { CommandPalette } from './CommandPalette';
import { workspaceCommandEventName } from './workspaceCommands';

const dispatchLayers = vi.fn();

/** Expone el estado del store para comprobar que la paleta ejecuta el comando real. */
const StateProbe = () => {
  const { activeTool, selection } = useProject();
  return <output data-testid="probe">{activeTool}|{selection && selection.kind !== 'multi' ? selection.id : 'none'}</output>;
};

/**
 * El proyecto que arranca sin almacenamiento esta vacio; la navegacion por
 * nudos y barras solo existe si hay modelo, asi que se carga uno real.
 */
const SeedModel = ({ seed }: { seed: boolean }) => {
  const { replaceProject } = useProject();
  const seeded = useRef(false);
  useEffect(() => {
    // `replaceProject` cambia de identidad con el proyecto: sin el guardia,
    // el efecto se volveria a disparar con cada reemplazo.
    if (!seed || seeded.current) return;
    seeded.current = true;
    replaceProject(createDefaultProject());
  }, [replaceProject, seed]);
  return null;
};

const renderPalette = ({ seed = false, onClose = () => {} }: { seed?: boolean; onClose?: () => void } = {}) => render(
  <ProjectProvider>
    <SeedModel seed={seed} />
    <StateProbe />
    <CommandPalette open onClose={onClose} dispatchLayers={dispatchLayers} />
  </ProjectProvider>,
);

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  localStorage.clear();
  dispatchLayers.mockClear();
});
afterEach(() => cleanup());

describe('CommandPalette', () => {
  it('offers an explicit close action for touch and pointer users', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPalette({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('runs an existing tool command instead of a palette-only action', async () => {
    const user = userEvent.setup();
    renderPalette();

    // El nombre accesible es "etiqueta - pista - atajo": esta es la herramienta
    // Nodo con su atajo N, no una entrada de navegacion "Nodo N1".
    await user.click(screen.getByRole('option', { name: 'Nodo · N' }));

    expect(screen.getByTestId('probe').textContent).toMatch(/^node\|/);
  });

  it('offers Model Doctor before analysis and emits the shared open command', async () => {
    const user = userEvent.setup();
    const openDoctor = vi.fn();
    window.addEventListener(workspaceCommandEventName('open-model-doctor'), openDoctor);
    renderPalette();

    await user.click(screen.getByRole('option', { name: /Model Doctor/i }));

    await waitFor(() => expect(openDoctor).toHaveBeenCalledTimes(1));
    window.removeEventListener(workspaceCommandEventName('open-model-doctor'), openDoctor);
  });

  it('offers the structure generator and emits the shared open command', async () => {
    const user = userEvent.setup();
    const openGenerator = vi.fn();
    window.addEventListener(workspaceCommandEventName('open-structure-generator'), openGenerator);
    renderPalette();

    // Se busca por lo que hace, no por el nombre de una familia concreta.
    await user.click(screen.getByRole('option', { name: /Generar estructura/i }));

    await waitFor(() => expect(openGenerator).toHaveBeenCalledTimes(1));
    window.removeEventListener(workspaceCommandEventName('open-structure-generator'), openGenerator);
  });

  it('does not expose Avisos as an independent result destination', () => {
    renderPalette();

    expect(screen.queryByRole('option', { name: /Avisos/i })).toBeNull();
  });

  it('offers N/V/M/deformed/map as evidence layers, not as Results tabs (CRI-100)', () => {
    renderPalette();

    const axial = screen.getByRole('option', { name: 'Evidencia: Axial' });
    const heatmap = screen.getByRole('option', { name: 'Evidencia: Mapa de demanda' });
    // No analysis yet: picking evidence would have nothing to light up.
    expect(axial.hasAttribute('disabled')).toBe(true);
    expect(heatmap.hasAttribute('disabled')).toBe(true);

    // The old tab-opening entries for these four are gone — evidence never
    // opens the Results panel again, it only lights a canvas layer.
    expect(screen.queryByRole('option', { name: 'Resultados: Axial' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Resultados: Deformada' })).toBeNull();
    // Reactions/summary/influence/learn are still dense Results-panel surfaces.
    expect(screen.getByRole('option', { name: 'Resultados: Resumen' })).toBeTruthy();
  });

  it('filters ignoring accents and case, over labels and hints alike', async () => {
    const user = userEvent.setup();
    renderPalette();

    // La pista de "Analizar" dice "combinacion" con tilde; la consulta no la lleva.
    await user.type(screen.getByRole('combobox'), 'COMBINACION');
    const list = screen.getByRole('listbox');

    expect(within(list).getByRole('option', { name: /analizar/i })).toBeTruthy();
  });

  it('finds bilingual export and diagnosis aliases while showing the destination', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByRole('combobox'), 'pdf');
    expect(screen.getByRole('option', { name: /Imprimir.*Exportar.*PDF/i })).toBeTruthy();

    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'diagnostico');
    expect(screen.getByRole('option', { name: /Model Doctor.*Análisis/i })).toBeTruthy();
  });

  it('asks for an explicit review before the palette can start a download', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByRole('combobox'), 'guardar');
    await user.click(screen.getByRole('option', { name: /Proyecto JSON.*Archivo JSON/i }));
    expect(screen.getByRole('heading', { name: 'Revisar acción' })).toBeTruthy();
    expect(screen.getByText(/descargar un archivo/i)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continuar' })));
    await user.click(screen.getByRole('button', { name: 'Volver a la paleta' }));
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('reports when nothing matches instead of showing an empty list', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByRole('combobox'), 'zzzzzz');

    expect(screen.getAllByText(/ningún comando coincide/i)).not.toHaveLength(0);
  });

  it('walks the list with the arrow keys and runs the highlighted command with Enter', async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = screen.getByRole('combobox');

    await user.type(input, 'seleccionar');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('probe').textContent).toMatch(/^select\|/);
  });

  it('delegates layer presets to the editor reducer, not to its own state', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(screen.getByRole('combobox'), 'capas');
    await user.click(screen.getByRole('option', { name: /capas: limpio/i }));

    expect(dispatchLayers).toHaveBeenCalledWith({ type: 'preset', preset: 'clean' });
  });

  it('emits the shared workspace command when navigating to a model object', async () => {
    const user = userEvent.setup();
    const focus = vi.fn();
    window.addEventListener(workspaceCommandEventName('focus-object'), focus);
    renderPalette({ seed: true });

    await user.click(await screen.findByRole('option', { name: /^Miembro M1/ }));

    expect(focus).toHaveBeenCalled();
    window.removeEventListener(workspaceCommandEventName('focus-object'), focus);
  });
});
