import type { Dispatch } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { ResultTab } from '../../store/ProjectContext';
import type { EditorLayerAction, EditorLayerState } from './editorLayers';
import { activateEvidenceLayer, applyEvidenceLayerChoice, EVIDENCE_LAYERS, isEvidenceLayerActive } from './evidenceLayers';
import { STACK_QUANTITIES, STACK_SYMBOLS, type StackQuantity } from './diagramStack';

const stackLabelKeys: Readonly<Record<StackQuantity, 'results.axial' | 'results.shear' | 'results.moment'>> = {
  axial: 'results.axial', shear: 'results.shear', moment: 'results.moment',
};
const evidenceSymbols: Readonly<Record<'axial' | 'shear' | 'moment', string>> = {
  axial: STACK_SYMBOLS.axial,
  shear: STACK_SYMBOLS.shear,
  moment: STACK_SYMBOLS.moment,
};

const primaryEvidence = EVIDENCE_LAYERS.filter((item): item is typeof EVIDENCE_LAYERS[number] & { id: keyof typeof evidenceSymbols } => item.id === 'axial' || item.id === 'shear' || item.id === 'moment');
const secondaryEvidence = EVIDENCE_LAYERS.filter(({ id }) => id === 'deformed');

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
  const chooseEvidence = (id: typeof primaryEvidence[number]['id'] | typeof secondaryEvidence[number]['id']) => {
    // A direct quantity is an exit from comparison, not a hidden update behind
    // the ACM sheet. Force it on so choosing the already-current result (for
    // example M after ACM) cannot accidentally leave the canvas empty.
    if (stackActive) {
      onStackToggle?.();
      activateEvidenceLayer(id, { setResultTab, dispatchLayers: dispatch });
      return;
    }
    applyEvidenceLayerChoice(id, { resultTab, layers }, { setResultTab, dispatchLayers: dispatch });
  };
  return <div className="canvas-evidence-rail" role="group" aria-label={t('canvas.evidenceLayers')} data-canvas-chrome="evidence" data-reading-mode={stackActive ? 'compare' : 'single'}>
    <span className="canvas-evidence-rail__label" aria-hidden="true">{t('canvas.evidenceResults')}</span>
    <div className="canvas-evidence-rail__primary">
      {primaryEvidence.map(({ id, labelKey }) => <button
        key={id}
        type="button"
        className={`canvas-evidence-layer canvas-evidence-layer--${id}`}
        aria-label={t(labelKey)}
        aria-pressed={!stackActive && isEvidenceLayerActive(id, resultTab, layers)}
        data-evidence-layer={id}
        onClick={() => chooseEvidence(id)}
      ><span className="canvas-evidence-layer__symbol" aria-hidden="true">{evidenceSymbols[id]}</span><span>{t(labelKey)}</span></button>)}
    </div>
    <button
      type="button"
      className="canvas-evidence-layer canvas-evidence-layer--stack"
      aria-pressed={stackActive}
      aria-label={t('canvas.evidenceStack')}
      disabled={!stackAvailable}
      data-evidence-layer="stack"
      onClick={onStackToggle}
    ><span className="canvas-evidence-layer__symbol" aria-hidden="true">ACM</span><span>{t('canvas.evidenceCompare')}</span></button>
    {secondaryEvidence.map(({ id, labelKey }) => <button
      key={id}
      type="button"
      className={`canvas-evidence-layer canvas-evidence-layer--${id} canvas-evidence-layer--secondary`}
      aria-label={t(labelKey)}
      aria-pressed={!stackActive && isEvidenceLayerActive(id, resultTab, layers)}
      data-evidence-layer={id}
      onClick={() => chooseEvidence(id)}
    ><span className="canvas-evidence-layer__symbol" aria-hidden="true">δ</span><span>{t(labelKey)}</span></button>)}
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
