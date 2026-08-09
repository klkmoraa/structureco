import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Experimental3DSceneModel } from './sceneModel';
import type { Experimental3DViewPreset } from './cameraModel';

export type Experimental3DCameraAction = Experimental3DViewPreset | 'zoom-in' | 'zoom-out' | 'reset';

export interface Experimental3DCameraCommand {
  readonly id: number;
  readonly action: Experimental3DCameraAction;
}

export interface Experimental3DViewportController {
  resize: () => void;
  setView: (preset: Experimental3DViewPreset) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
  dispose: () => void;
}

export type Experimental3DViewportFactory = (
  canvas: HTMLCanvasElement,
  model: Experimental3DSceneModel,
) => Experimental3DViewportController;

interface Experimental3DCanvasProps {
  model: Experimental3DSceneModel;
  label: string;
  command: Experimental3DCameraCommand | null;
  createController: Experimental3DViewportFactory;
  onAvailabilityChange?: (unavailable: boolean) => void;
  fallbackCopy: Readonly<{
    title: string;
    body: string;
    retry: string;
  }>;
}

export const Experimental3DCanvas = ({ model, label, command, createController, onAvailabilityChange, fallbackCopy }: Experimental3DCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Experimental3DViewportController | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const release = () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      release();
      setUnavailable(true);
      onAvailabilityChange?.(true);
    };

    try {
      const controller = createController(canvas, model);
      controllerRef.current = controller;
      canvas.addEventListener('webglcontextlost', onContextLost);
      const resizeObserver = new ResizeObserver(() => controller.resize());
      resizeObserver.observe(canvas);
      controller.resize();
      return () => {
        resizeObserver.disconnect();
        canvas.removeEventListener('webglcontextlost', onContextLost);
        release();
      };
    } catch {
      release();
      setUnavailable(true);
      onAvailabilityChange?.(true);
      return undefined;
    }
  }, [createController, model, onAvailabilityChange, retryVersion]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !command) return;
    if (command.action === 'front' || command.action === 'isometric') controller.setView(command.action);
    else if (command.action === 'zoom-in') controller.zoomBy(0.8);
    else if (command.action === 'zoom-out') controller.zoomBy(1.25);
    else controller.reset();
  }, [command]);

  if (unavailable) {
    return <div className="experimental-3d-fallback" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <div>
        <strong>{fallbackCopy.title}</strong>
        <p>{fallbackCopy.body}</p>
      </div>
      <button type="button" onClick={() => {
        setUnavailable(false);
        onAvailabilityChange?.(false);
        setRetryVersion((current) => current + 1);
      }}>
        <RotateCcw size={16} aria-hidden="true" /> {fallbackCopy.retry}
      </button>
    </div>;
  }

  return <canvas ref={canvasRef} className="experimental-3d-canvas" role="img" aria-label={label} />;
};
