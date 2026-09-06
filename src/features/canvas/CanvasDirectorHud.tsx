import { memo } from 'react';
import { Columns2, Rows2, Play, Pause, Zap, Maximize2, Compass, Box } from 'lucide-react';
import type { StackLayout } from './diagramStack';
import type { ReactionDisplayMode } from './supportCompass';

export interface CanvasDirectorHudProps {
  visible: boolean;
  vibrationActive: boolean;
  onToggleVibration: () => void;
  vibrationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  vibrationAmplitude: number;
  onChangeAmplitude: (amplitude: number) => void;
  forceFlowActive: boolean;
  onToggleForceFlow: () => void;
  reactionMode?: ReactionDisplayMode;
  onCycleReactionMode?: () => void;
  solidModeActive?: boolean;
  onToggleSolidMode?: () => void;
  stackActive: boolean;
  stackLayout: StackLayout;
  onToggleStackLayout: () => void;
  onFitCamera: () => void;
}

const SPEED_OPTIONS = [0.5, 1.0, 2.0];
const AMPLITUDE_OPTIONS = [1.0, 2.5, 5.0];

const CanvasDirectorHudImpl = ({
  visible,
  vibrationActive,
  onToggleVibration,
  vibrationSpeed,
  onChangeSpeed,
  vibrationAmplitude,
  onChangeAmplitude,
  forceFlowActive,
  onToggleForceFlow,
  reactionMode = 'both',
  onCycleReactionMode,
  solidModeActive = false,
  onToggleSolidMode,
  stackActive,
  stackLayout,
  onToggleStackLayout,
  onFitCamera,
}: CanvasDirectorHudProps) => {
  if (!visible) return null;

  const cycleSpeed = () => {
    const nextIndex = (SPEED_OPTIONS.indexOf(vibrationSpeed) + 1) % SPEED_OPTIONS.length;
    onChangeSpeed(SPEED_OPTIONS[nextIndex]);
  };

  const cycleAmplitude = () => {
    const nextIndex = (AMPLITUDE_OPTIONS.indexOf(vibrationAmplitude) + 1) % AMPLITUDE_OPTIONS.length;
    onChangeAmplitude(AMPLITUDE_OPTIONS[nextIndex]);
  };

  return (
    <aside
      className="canvas-director-hud"
      aria-label="Controles cinemáticos del lienzo"
      data-canvas-chrome="director-hud"
      data-testid="canvas-director-hud"
    >
      <div className="director-hud-group">
        <button
          type="button"
          className={`director-hud-btn${vibrationActive ? ' is-active' : ''}`}
          onClick={onToggleVibration}
          aria-pressed={vibrationActive}
          title={vibrationActive ? 'Pausar oscilación armónica' : 'Activar vibración armónica en tiempo real'}
          data-testid="director-vibration-toggle"
        >
          {vibrationActive ? <Pause size={14} /> : <Play size={14} />}
          <span>{vibrationActive ? 'Oscilando' : 'Vibración'}</span>
          {vibrationActive ? <span className="director-hud-pulse" aria-hidden="true" /> : null}
        </button>

        {vibrationActive ? (
          <>
            <button
              type="button"
              className="director-hud-pill-btn"
              onClick={cycleSpeed}
              title={`Velocidad de oscilación: ${vibrationSpeed}x (haz clic para cambiar)`}
              data-testid="director-speed-cycle"
            >
              <span>{vibrationSpeed}x</span>
            </button>
            <button
              type="button"
              className="director-hud-pill-btn"
              onClick={cycleAmplitude}
              title={`Amplificación de deformada: ${vibrationAmplitude}x`}
              data-testid="director-amp-cycle"
            >
              <span>{vibrationAmplitude}x amp</span>
            </button>
          </>
        ) : null}
      </div>

      <div className="director-hud-divider" aria-hidden="true" />

      <div className="director-hud-group">
        <button
          type="button"
          className={`director-hud-btn${forceFlowActive ? ' is-active' : ''}`}
          onClick={onToggleForceFlow}
          aria-pressed={forceFlowActive}
          title={forceFlowActive ? 'Ocultar flujo de esfuerzos' : 'Visualizar flujo dinámico de esfuerzos y cargas'}
          data-testid="director-force-flow-toggle"
        >
          <Zap size={14} />
          <span>Flujo</span>
        </button>
      </div>

      {onCycleReactionMode ? (
        <>
          <div className="director-hud-divider" aria-hidden="true" />
          <div className="director-hud-group">
            <button
              type="button"
              className={`director-hud-btn${reactionMode !== 'cartesian' ? ' is-active' : ''}`}
              onClick={onCycleReactionMode}
              title={`Visualización de reacciones: ${
                reactionMode === 'polar'
                  ? 'Brújula Polar (vector resultante)'
                  : reactionMode === 'both'
                    ? 'Híbrido (Polar + Cartesiano)'
                    : 'Cartesiano tradicional (Rx, Ry)'
              }. Clic para alternar.`}
              data-testid="director-reaction-mode-toggle"
            >
              <Compass size={14} />
              <span>{reactionMode === 'polar' ? 'Brújula' : reactionMode === 'both' ? 'Polar + XY' : 'Cartesiano'}</span>
            </button>
          </div>
        </>
      ) : null}

      {onToggleSolidMode ? (
        <>
          <div className="director-hud-divider" aria-hidden="true" />
          <div className="director-hud-group">
            <button
              type="button"
              className={`director-hud-btn${solidModeActive ? ' is-active' : ''}`}
              onClick={onToggleSolidMode}
              aria-pressed={solidModeActive}
              title={
                solidModeActive
                  ? 'Volver a vista analítica unifilar (alambre 1D)'
                  : 'Extrusión 2.5D: visualizar volumetría física de perfiles I/tubulares y orientación'
              }
              data-testid="director-solid-mode-toggle"
            >
              <Box size={14} />
              <span>{solidModeActive ? 'Sólido 2.5D' : 'Wireframe'}</span>
            </button>
          </div>
        </>
      ) : null}

      {stackActive ? (
        <>
          <div className="director-hud-divider" aria-hidden="true" />
          <div className="director-hud-group">
            <button
              type="button"
              className="director-hud-btn"
              onClick={onToggleStackLayout}
              title={`Disposición de réplicas en mundo: ${stackLayout === 'rows' ? 'Filas (apiladas)' : 'Columnas (lado a lado)'}. Clic para alternar.`}
              data-testid="director-layout-toggle"
            >
              {stackLayout === 'rows' ? <Rows2 size={14} /> : <Columns2 size={14} />}
              <span>{stackLayout === 'rows' ? 'Filas' : 'Columnas'}</span>
            </button>
          </div>
        </>
      ) : null}

      <div className="director-hud-divider" aria-hidden="true" />

      <div className="director-hud-group">
        <button
          type="button"
          className="director-hud-icon-btn"
          onClick={onFitCamera}
          title="Ajustar encuadre suave al modelo"
          aria-label="Ajustar encuadre suave al modelo"
          data-testid="director-fit-btn"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </aside>
  );
};

export const CanvasDirectorHud = memo(CanvasDirectorHudImpl);
