/**
 * Lienzo de Space 3D: ciclo de vida React/WebGL, controles de cámara y
 * degradación honesta.
 *
 * El resumen semántico no es un extra del fallback: está siempre en el árbol,
 * porque un lienzo WebGL es opaco para un lector de pantalla incluso cuando
 * funciona. Si el visor cae, lo único que desaparece es la imagen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Box, Maximize2, Minus, Plus, RotateCcw, SquareDashed } from 'lucide-react';
import { SPACE3D_VIEW_PRESETS, type Space3DViewPreset } from './cameraModel';
import { createSpace3DViewport, type Space3DLayerVisibility, type Space3DViewport } from './threeViewport';
import type { Space3DSceneModel } from './sceneModel';
import type { Space3DSelection } from '../store/Space3DProjectContext';

export interface Space3DCanvasCopy {
  readonly label: string;
  readonly fallbackTitle: string;
  readonly fallbackBody: string;
  readonly retry: string;
  readonly summaryTitle: string;
  readonly nodes: string;
  readonly members: string;
  readonly supports: string;
  readonly loads: string;
}

export type Space3DViewportFactory = (options: {
  canvas: HTMLCanvasElement;
  model: Space3DSceneModel;
  layers: Space3DLayerVisibility;
}) => Space3DViewport;

export interface Space3DCanvasProps {
  readonly model: Space3DSceneModel;
  readonly layers: Space3DLayerVisibility;
  readonly copy: Space3DCanvasCopy;
  readonly onSelect?: (selection: Space3DSelection | null) => void;
  readonly createViewport?: Space3DViewportFactory;
  readonly viewLabels?: Readonly<Record<Space3DViewPreset, string>>;
  readonly zoomInLabel?: string;
  readonly zoomOutLabel?: string;
  readonly resetLabel?: string;
}

const DEFAULT_VIEW_LABELS: Record<Space3DViewPreset, string> = {
  front: 'Vista frontal',
  top: 'Vista superior',
  side: 'Vista lateral',
  isometric: 'Vista isométrica',
};

const VIEW_ICONS: Record<Space3DViewPreset, typeof Box> = {
  front: SquareDashed,
  top: Maximize2,
  side: SquareDashed,
  isometric: Box,
};

const defaultFactory: Space3DViewportFactory = (options) => createSpace3DViewport(options);

export const Space3DCanvas = ({
  model,
  layers,
  copy,
  onSelect,
  createViewport = defaultFactory,
  viewLabels = DEFAULT_VIEW_LABELS,
  zoomInLabel = 'Acercar',
  zoomOutLabel = 'Alejar',
  resetLabel = 'Restablecer vista',
}: Space3DCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Space3DViewport | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || unavailable) return undefined;

    const release = () => {
      viewportRef.current?.dispose();
      viewportRef.current = null;
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      release();
      setUnavailable(true);
    };

    try {
      const viewport = createViewport({
        canvas,
        model: modelRef.current,
        layers: layersRef.current,
      });
      viewportRef.current = viewport;
      canvas.addEventListener('webglcontextlost', onContextLost);
      const observer = new ResizeObserver(() => viewport.resize());
      observer.observe(canvas);
      viewport.resize();
      return () => {
        observer.disconnect();
        canvas.removeEventListener('webglcontextlost', onContextLost);
        release();
      };
    } catch {
      release();
      setUnavailable(true);
      return undefined;
    }
    // `model` y `layers` se aplican por sus propios efectos: recrear el visor en
    // cada edición tiraría la cámara del usuario al suelo en cada tecla.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [createViewport, unavailable, attempt]);

  const modelRef = useRef(model);
  const layersRef = useRef(layers);

  useEffect(() => {
    modelRef.current = model;
    viewportRef.current?.setModel(model);
  }, [model]);

  useEffect(() => {
    layersRef.current = layers;
    viewportRef.current?.setLayers(layers);
  }, [layers]);

  const retry = useCallback(() => {
    setUnavailable(false);
    setAttempt((current) => current + 1);
  }, []);

  const summary = <div
    className="space3d-canvas-summary"
    role="group"
    aria-label={copy.summaryTitle}
  >
    <span><b>{model.nodes.length}</b> {copy.nodes}</span>
    <span><b>{model.members.length}</b> {copy.members}</span>
    <span><b>{model.supports.length}</b> {copy.supports}</span>
    <span><b>{model.loads.length}</b> {copy.loads}</span>
  </div>;

  return <div className="space3d-canvas">
    <div className="space3d-canvas-stage">
      {unavailable
        ? <div className="space3d-canvas-fallback" role="alert">
          <AlertTriangle size={22} aria-hidden="true" />
          <div>
            <strong>{copy.fallbackTitle}</strong>
            <p>{copy.fallbackBody}</p>
          </div>
          <button type="button" className="space3d-button" onClick={retry}>
            <RotateCcw size={16} aria-hidden="true" /> {copy.retry}
          </button>
        </div>
        : <canvas
          ref={canvasRef}
          className="space3d-canvas-surface"
          role="img"
          aria-label={copy.label}
          // Enfocable para que la órbita por teclado de OrbitControls funcione;
          // la selección sin puntero se hace desde la lista de entidades.
          tabIndex={0}
          onPointerDown={(event) => {
            if (!selectRef.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            selectRef.current(viewportRef.current?.pickAt(event.clientX - rect.left, event.clientY - rect.top) ?? null);
          }}
        />}
    </div>

    <div className="space3d-canvas-controls">
      <div className="space3d-tray" role="group" aria-label={resetLabel}>
        {SPACE3D_VIEW_PRESETS.map((preset) => {
          const Icon = VIEW_ICONS[preset];
          return <button
            key={preset}
            type="button"
            className="space3d-tool"
            onClick={() => viewportRef.current?.setView(preset)}
            title={viewLabels[preset]}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="space3d-visually-hidden">{viewLabels[preset]}</span>
          </button>;
        })}
      </div>
      <div className="space3d-tray" role="group" aria-label={zoomInLabel}>
        <button type="button" className="space3d-tool" onClick={() => viewportRef.current?.zoomBy(0.8)} title={zoomInLabel}>
          <Plus size={17} aria-hidden="true" />
          <span className="space3d-visually-hidden">{zoomInLabel}</span>
        </button>
        <button type="button" className="space3d-tool" onClick={() => viewportRef.current?.zoomBy(1.25)} title={zoomOutLabel}>
          <Minus size={17} aria-hidden="true" />
          <span className="space3d-visually-hidden">{zoomOutLabel}</span>
        </button>
        <button type="button" className="space3d-tool" onClick={() => viewportRef.current?.setView('isometric')} title={resetLabel}>
          <RotateCcw size={17} aria-hidden="true" />
          <span className="space3d-visually-hidden">{resetLabel}</span>
        </button>
      </div>
      {summary}
    </div>
  </div>;
};
