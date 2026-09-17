import { Box, ChartNoAxesCombined, ClipboardCheck, Zap, type LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import type { EditorLayerPresetId } from './editorLayers';

type CanvasFocusMode = Extract<EditorLayerPresetId, 'model' | 'loads' | 'results' | 'review'>;

const modes: Array<{ id: CanvasFocusMode; labelKey: TranslationKey; icon: LucideIcon }> = [
  { id: 'model', labelKey: 'canvas.focusModel', icon: Box },
  { id: 'loads', labelKey: 'canvas.focusLoads', icon: Zap },
  { id: 'results', labelKey: 'canvas.focusResults', icon: ChartNoAxesCombined },
  { id: 'review', labelKey: 'canvas.focusReview', icon: ClipboardCheck },
];

export const CanvasFocusModes = ({
  activePreset,
  analysisAvailable,
  onSelect,
}: {
  activePreset: EditorLayerPresetId | null;
  analysisAvailable: boolean;
  onSelect: (preset: CanvasFocusMode) => void;
}) => {
  const { t } = useI18n();
  return <div className="canvas-focus-modes" role="group" aria-label={t('canvas.focusModes')} data-testid="canvas-focus-modes">
    {modes.map(({ id, labelKey, icon: Icon }) => <button
      key={id}
      type="button"
      className={activePreset === id ? 'is-active' : undefined}
      aria-pressed={activePreset === id}
      aria-label={`${t('canvas.focusModes')}: ${t(labelKey)}`}
      data-focus-mode={id}
      disabled={id === 'results' && !analysisAvailable}
      onClick={() => onSelect(id)}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{t(labelKey)}</span>
    </button>)}
  </div>;
};
