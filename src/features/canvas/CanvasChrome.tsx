import { Crosshair, LocateFixed, Minus, Plus, X } from 'lucide-react';
import { useEffect, type Dispatch, type RefObject } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../design-system/components/controls';
import type { ResultTab } from '../../store/ProjectContext';
import { CanvasLayers } from './CanvasLayers';
import { CanvasEvidenceRail } from './CanvasEvidenceRail';
import type { StackQuantity } from './diagramStack';
import type { EditorLayerAction, EditorLayerState } from './editorLayers';
import { onWorkspaceCommand } from '../workspace/workspaceCommands';
import { planScaleBar, scaleBarLabel } from './scaleBar';
import './mobileCanvasDensity.css';

/** Ancho máximo de la regla: cabe en la píldora de estado sin empujar las coordenadas. */
const SCALE_BAR_MAX_PX = 108;
const SCALE_BAR_HEIGHT_PX = 9;

export interface CanvasChromeProps {
  modeLabel: string;
  placementInstruction: string | null;
  showHelp: boolean;
  layers: EditorLayerState;
  dispatchLayers: Dispatch<EditorLayerAction>;
  resultTab: ResultTab;
  setResultTab: (tab: ResultTab) => void;
  analysisAvailable: boolean;
  snapEnabled: boolean;
  gridEnabled: boolean;
  coordinateReadoutRef: RefObject<HTMLOutputElement | null>;
  lengthLabel: string;
  /** Píxeles que mide una unidad de longitud **de presentación** en el zoom actual. */
  pixelsPerLengthUnit: number;
  onCancelPlacement: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  stackActive?: boolean;
  stackAvailable?: boolean;
  stackQuantities?: readonly StackQuantity[];
  onStackToggle?: () => void;
  onStackQuantityToggle?: (quantity: StackQuantity) => void;
}

/** Presentation-only canvas controls. Camera and model mutations stay upstream. */
export const CanvasChrome = ({
  modeLabel,
  placementInstruction,
  showHelp,
  layers,
  dispatchLayers,
  resultTab,
  setResultTab,
  analysisAvailable,
  snapEnabled,
  gridEnabled,
  coordinateReadoutRef,
  lengthLabel,
  pixelsPerLengthUnit,
  onCancelPlacement,
  onZoomIn,
  onZoomOut,
  onFit,
  stackActive,
  stackAvailable,
  stackQuantities,
  onStackToggle,
  onStackQuantityToggle,
}: CanvasChromeProps) => {
  const { t } = useI18n();
  // Una barra de escala se mide con la regla del propio dibujo. El cociente
  // «1.57×» que ocupaba este sitio comparaba el zoom con una referencia interna
  // que no significa nada fuera del código.
  const scaleBar = planScaleBar(pixelsPerLengthUnit, SCALE_BAR_MAX_PX);

  useEffect(() => {
    return onWorkspaceCommand('fit-canvas', () => onFit());
  }, [onFit]);

  return <>
    <div className={`canvas-mode-badge${placementInstruction ? ' placing-load' : ''}`} role="status" aria-live="polite" data-canvas-chrome="mode">
      <strong>{modeLabel}</strong>
      {placementInstruction ? <span className="canvas-action-instruction">{placementInstruction}</span> : showHelp ? <>
        <span className="desktop-gesture-hint">{t('canvas.gestureDesktop')}</span>
        <span className="touch-gesture-hint">{t('canvas.gestureTouch')}</span>
      </> : null}
      {placementInstruction ? <IconButton size="sm" label={t('canvas.cancelPlacement')} onClick={onCancelPlacement}><X size={14} /></IconButton> : null}
    </div>
    <CanvasLayers layers={layers} dispatch={dispatchLayers} />
    <CanvasEvidenceRail layers={layers} dispatch={dispatchLayers} resultTab={resultTab} setResultTab={setResultTab} visible={analysisAvailable} stackActive={stackActive} stackAvailable={stackAvailable} stackQuantities={stackQuantities} onStackToggle={onStackToggle} onStackQuantityToggle={onStackQuantityToggle} />
    <div className="canvas-view-chips" role="status" aria-label={t('canvas.viewStatus')} data-canvas-chrome="view-status">
      <span className={snapEnabled ? 'active' : ''}>{snapEnabled ? t('canvas.snapOn') : t('canvas.snapOff')}</span>
      <span className={gridEnabled ? 'active' : ''}>{gridEnabled ? t('canvas.gridOn') : t('canvas.gridOff')}</span>
    </div>
    <div className="canvas-controls" role="group" aria-label={t('canvas.viewControls')} data-canvas-chrome="camera">
      <IconButton label={t('canvas.zoomIn')} title={t('canvas.zoomIn')} onClick={onZoomIn}><Plus size={18} /></IconButton>
      <IconButton label={t('canvas.zoomOut')} title={t('canvas.zoomOut')} onClick={onZoomOut}><Minus size={18} /></IconButton>
      <IconButton label={t('canvas.fit')} title={t('canvas.fit')} onClick={() => onFit()}><LocateFixed size={18} /></IconButton>
    </div>
    <div className="canvas-status" data-canvas-chrome="coordinates">
      <Crosshair size={14} aria-hidden="true" />
      <output ref={coordinateReadoutRef} className="canvas-coordinate-output" aria-label={t('canvas.coordinates')}>X — · Y — {lengthLabel}</output>
      <span className="canvas-status-divider" aria-hidden="true">·</span>
      <span
        className="canvas-scale-bar"
        role="img"
        aria-label={`${t('canvas.scale')} ${scaleBar ? scaleBarLabel(scaleBar.length, lengthLabel) : '—'}`}
        data-scale-bar-px={scaleBar ? Math.round(scaleBar.widthPx) : 0}
      >
        {scaleBar ? <svg
          className="canvas-scale-bar-rule"
          width={Math.round(scaleBar.widthPx)}
          height={SCALE_BAR_HEIGHT_PX}
          viewBox={`0 0 ${Math.round(scaleBar.widthPx)} ${SCALE_BAR_HEIGHT_PX}`}
          aria-hidden="true"
        >
          <path d={`M0.5 1V${SCALE_BAR_HEIGHT_PX - 1}M${Math.round(scaleBar.widthPx) - 0.5} 1V${SCALE_BAR_HEIGHT_PX - 1}M0.5 ${SCALE_BAR_HEIGHT_PX / 2}H${Math.round(scaleBar.widthPx) - 0.5}`} />
        </svg> : null}
        <span className="canvas-scale-output">{scaleBar ? scaleBarLabel(scaleBar.length, lengthLabel) : `— ${lengthLabel}`}</span>
      </span>
    </div>
  </>;
};
