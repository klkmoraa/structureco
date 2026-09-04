// @vitest-environment jsdom
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { CanvasChrome } from './CanvasChrome';
import { createEditorLayerState } from './editorLayers';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('CanvasChrome', () => {
  it('renders camera, layers, mode and coordinate surfaces while delegating every command', async () => {
    const user = userEvent.setup();
    const onCancelPlacement = vi.fn();
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFit = vi.fn();
    const dispatchLayers = vi.fn();
    const coordinateReadoutRef = createRef<HTMLOutputElement>();
    const { container } = render(<ProjectProvider><CanvasChrome
      modeLabel="Carga puntual"
      placementInstruction="Elige un nodo"
      showHelp
      layers={createEditorLayerState()}
      dispatchLayers={dispatchLayers}
      resultTab="moment"
      setResultTab={vi.fn()}
      analysisAvailable={false}
      snapEnabled
      gridEnabled={false}
      coordinateReadoutRef={coordinateReadoutRef}
      lengthLabel="m"
      pixelsPerLengthUnit={102}
      onCancelPlacement={onCancelPlacement}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
      onFit={onFit}
    /></ProjectProvider>);

    expect(container.querySelectorAll('[data-canvas-chrome]')).toHaveLength(5);
    expect(screen.queryByRole('group', { name: 'Evidencia' })).toBeNull();
    expect(screen.getByText('Elige un nodo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar colocación' })).toBeTruthy();
    expect(container.querySelector('.canvas-mode-badge')?.classList.contains('placing-load')).toBe(true);
    expect(screen.getByText('SNAP activo')).toBeTruthy();
    expect(screen.getByText('GRID inactivo')).toBeTruthy();
    expect(coordinateReadoutRef.current?.textContent).toContain('X — · Y — m');
    // La barra de escala rotula una longitud redonda del modelo, no un cociente
    // de zoom: a 102 px por metro la mayor que cabe en la píldora es 1 m.
    expect(container.querySelector('.canvas-scale-output')?.textContent).toBe('1 m');
    expect(container.querySelector('.canvas-scale-bar')?.getAttribute('data-scale-bar-px')).toBe('102');

    await user.click(screen.getByRole('button', { name: 'Acercar' }));
    await user.click(screen.getByRole('button', { name: 'Alejar' }));
    await user.click(screen.getByRole('button', { name: 'Ajustar modelo a la vista' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar colocación' }));

    expect(onZoomIn).toHaveBeenCalledOnce();
    expect(onZoomOut).toHaveBeenCalledOnce();
    expect(onFit).toHaveBeenCalledOnce();
    expect(onFit.mock.calls[0]).toHaveLength(0);
    expect(onCancelPlacement).toHaveBeenCalledOnce();

    window.dispatchEvent(new CustomEvent('structureco:fit-canvas'));
    expect(onFit).toHaveBeenCalledTimes(2);
    expect(onFit.mock.calls[1]).toHaveLength(0);
  });
});
