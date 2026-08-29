import type { Dispatch } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { ResultTab } from '../../store/ProjectContext';
import type { EditorLayerAction, EditorLayerState } from './editorLayers';
import { applyEvidenceLayerChoice, EVIDENCE_LAYERS, isEvidenceLayerActive } from './evidenceLayers';
import { STACK_QUANTITIES, STACK_SYMBOLS, type StackQuantity } from './diagramStack';

const stackLabelKeys: Readonly<Record<StackQuantity, 'results.axial' | 'results.shear' | 'results.moment'>> = {
  axial: 'results.axial', shear: 'results.shear', moment: 'results.moment',
};

/** Presentation-only result overlays, anchored directly to the canvas. */
export const CanvasEvidenceRail = ({
  layers,
  dispatch,
  resultTab,
  setResultTab,
  visible,
  stackActive = false,
  stackAvailable = false,
  stackQuantities = STACK_QUANTITIES,
  onStackToggle,
  onStackQuantityToggle,
}: {
  layers: EditorLayerState;
  dispatch: Dispatch<EditorLayerAction>;
  resultTab: ResultTab;
  setResultTab: (tab: ResultTab) => void;
  visible: boolean;
  stackActive?: boolean;
  stackAvailable?: boolean;
  stackQuantities?: readonly StackQuantity[];
  onStackToggle?: () => void;
  onStackQuantityToggle?: (quantity: StackQuantity) => void;
}) => {
  const { t } = useI18n();
  if (!visible) return null;
  return <div className="canvas-evidence-rail" role="group" aria-label={t('canvas.evidenceLayers')} data-canvas-chrome="evidence">
    {EVIDENCE_LAYERS.filter(({ id }) => id !== 'heatmap').map(({ id, labelKey }) => <button
      key={id}
      type="button"
      className={`canvas-evidence-layer canvas-evidence-layer--${id}`}
      aria-pressed={isEvidenceLayerActive(id, resultTab, layers)}
      data-evidence-layer={id}
      onClick={() => applyEvidenceLayerChoice(id, { resultTab, layers }, { setResultTab, dispatchLayers: dispatch })}
    >{t(labelKey)}</button>)}
    <button
      type="button"
      className="canvas-evidence-layer canvas-evidence-layer--stack"
      aria-pressed={stackActive}
      aria-label={t('canvas.evidenceStack')}
      disabled={!stackAvailable}
      data-evidence-layer="stack"
      onClick={onStackToggle}
    >ACM</button>
    {stackActive ? <div className="canvas-evidence-stack-choices" role="group" aria-label={t('canvas.evidenceStack')}>
      {STACK_QUANTITIES.map((quantity) => {
        const selected = stackQuantities.includes(quantity);
        return <button
          key={quantity}
          type="button"
          className="canvas-evidence-stack-choice"
          aria-label={t(stackLabelKeys[quantity])}
          aria-pressed={selected}
          disabled={selected && stackQuantities.length === 1}
          data-evidence-stack-quantity={quantity}
          onClick={() => onStackQuantityToggle?.(quantity)}
        >{STACK_SYMBOLS[quantity]}</button>;
      })}
    </div> : null}
  </div>;
};
