import type { Dispatch } from 'react';
import { useI18n } from '../../i18n/useI18n';
import type { ResultTab } from '../../store/ProjectContext';
import type { EditorLayerAction, EditorLayerState } from './editorLayers';
import { applyEvidenceLayerChoice, EVIDENCE_LAYERS, isEvidenceLayerActive } from './evidenceLayers';

/** Presentation-only result overlays, anchored directly to the canvas. */
export const CanvasEvidenceRail = ({
  layers,
  dispatch,
  resultTab,
  setResultTab,
}: {
  layers: EditorLayerState;
  dispatch: Dispatch<EditorLayerAction>;
  resultTab: ResultTab;
  setResultTab: (tab: ResultTab) => void;
}) => {
  const { t } = useI18n();
  return <div className="canvas-evidence-rail" role="group" aria-label={t('canvas.evidenceLayers')} data-canvas-chrome="evidence">
    {EVIDENCE_LAYERS.map(({ id, labelKey }) => <button
      key={id}
      type="button"
      className={`canvas-evidence-layer canvas-evidence-layer--${id}`}
      aria-pressed={isEvidenceLayerActive(id, resultTab, layers)}
      data-evidence-layer={id}
      onClick={() => applyEvidenceLayerChoice(id, { resultTab, layers }, { setResultTab, dispatchLayers: dispatch })}
    >{t(labelKey)}</button>)}
  </div>;
};
