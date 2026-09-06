import { memo, useCallback } from 'react';
import type { ReactionDisplayMode } from './supportCompass';
import { haptics } from '../../platform/haptics';
import { emitWorkspaceCommand } from '../workspace/workspaceCommands';

export interface CanvasOrientationCompassProps {
  onFit: () => void;
  reactionMode: ReactionDisplayMode;
  onCycleReactionMode: () => void;
  compact?: boolean;
  visible?: boolean;
}

const CanvasOrientationCompassImpl = ({
  onFit,
  reactionMode,
  onCycleReactionMode,
  compact = false,
  visible = true,
}: CanvasOrientationCompassProps) => {
  const handleFit = useCallback(() => {
    haptics.impact('light');
    onFit();
  }, [onFit]);

  const handleCycleMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.selection();
    onCycleReactionMode();
    const nextMode = reactionMode === 'both' ? 'polar' : reactionMode === 'polar' ? 'cartesian' : 'both';
    const message = nextMode === 'both'
      ? 'Reacciones: Brújula polar + Cartesiano'
      : nextMode === 'polar'
        ? 'Reacciones: Solo brújula polar'
        : 'Reacciones: Cartesiano tradicional (Rx, Ry)';
    emitWorkspaceCommand('show-toast', {
      message,
      tone: 'info',
      durationMs: 2500,
    });
  }, [onCycleReactionMode, reactionMode]);

  if (!visible) return null;

  const modeLabel = reactionMode === 'both'
    ? 'Polar + XY'
    : reactionMode === 'polar'
      ? 'Brújula'
      : 'Cartesiano';

  const discSize = compact ? 44 : 52;
  const center = discSize / 2;

  return (
    <div
      className={`canvas-orientation-compass${compact ? ' is-compact' : ''}`}
      data-canvas-chrome="orientation-compass"
      data-testid="orientation-compass"
    >
      <button
        type="button"
        className="orientation-compass-disc"
        onClick={handleFit}
        title="Brújula de orientación: clic para encuadrar y centrar modelo (Fit)"
        aria-label="Brújula de orientación: centrar modelo"
        data-testid="orientation-compass-disc"
      >
        <svg
          width={discSize}
          height={discSize}
          viewBox={`0 0 ${discSize} ${discSize}`}
          className="orientation-compass-svg"
          aria-hidden="true"
        >
          {/* Base y bisel claymorphic */}
          <circle
            cx={center}
            cy={center}
            r={center - 2}
            className="orientation-compass-base"
          />
          <circle
            cx={center}
            cy={center}
            r={center - 5}
            className="orientation-compass-groove"
          />

          {/* Marcas cardinales (ticks) */}
          <line
            x1={center}
            y1={4}
            x2={center}
            y2={8}
            className="orientation-compass-tick is-cardinal is-north"
          />
          <line
            x1={discSize - 4}
            y1={center}
            x2={discSize - 8}
            y2={center}
            className="orientation-compass-tick is-cardinal"
          />
          <line
            x1={center}
            y1={discSize - 4}
            x2={center}
            y2={discSize - 8}
            className="orientation-compass-tick is-cardinal"
          />
          <line
            x1={4}
            y1={center}
            x2={8}
            y2={center}
            className="orientation-compass-tick is-cardinal"
          />

          {/* Letras cardinales */}
          <text
            x={center}
            y={12}
            textAnchor="middle"
            className="orientation-compass-letter is-north"
          >
            N
          </text>
          <text
            x={discSize - 10}
            y={center + 3}
            textAnchor="middle"
            className="orientation-compass-letter"
          >
            E
          </text>
          <text
            x={center}
            y={discSize - 7}
            textAnchor="middle"
            className="orientation-compass-letter"
          >
            S
          </text>
          <text
            x={10}
            y={center + 3}
            textAnchor="middle"
            className="orientation-compass-letter"
          >
            W
          </text>

          {/* Aguja de navegación 3D facets */}
          {/* Aguja Norte (Rojo / Vermellón) */}
          <polygon
            points={`${center},${center - 13} ${center - 4},${center} ${center},${center - 2}`}
            className="orientation-compass-needle-n-left"
          />
          <polygon
            points={`${center},${center - 13} ${center + 4},${center} ${center},${center - 2}`}
            className="orientation-compass-needle-n-right"
          />

          {/* Aguja Sur (Pizarra / Plata) */}
          <polygon
            points={`${center},${center + 13} ${center - 4},${center} ${center},${center + 2}`}
            className="orientation-compass-needle-s-left"
          />
          <polygon
            points={`${center},${center + 13} ${center + 4},${center} ${center},${center + 2}`}
            className="orientation-compass-needle-s-right"
          />

          {/* Pin central táctil de arcilla */}
          <circle
            cx={center}
            cy={center}
            r={3.8}
            className="orientation-compass-pin"
          />
          <circle
            cx={center - 1}
            cy={center - 1}
            r={1.2}
            className="orientation-compass-pin-dot"
          />
        </svg>
      </button>

      {/* Píldora táctil para alternar visualización de reacciones */}
      <button
        type="button"
        className="orientation-compass-mode-pill"
        onClick={handleCycleMode}
        title={`Modo de reacciones: ${modeLabel}. Clic para alternar.`}
        aria-label={`Modo de reacciones: ${modeLabel}. Clic para alternar.`}
        data-testid="orientation-compass-mode-pill"
      >
        <span className="orientation-compass-mode-icon" aria-hidden="true">🧭</span>
        <span className="orientation-compass-mode-text">{modeLabel}</span>
      </button>
    </div>
  );
};

export const CanvasOrientationCompass = memo(CanvasOrientationCompassImpl);
