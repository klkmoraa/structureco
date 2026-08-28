import { Redo2, Undo2 } from 'lucide-react';
import { IconButton } from '../../design-system/components/controls';
import { DEFAULT_PDELTA_CONFIG } from '../../engine/pDelta';
import { useI18n } from '../../i18n/useI18n';
import { useProjectModel } from '../../store/ProjectContext';
import type { TranslationKey } from '../../i18n/catalogs';
import type { PDeltaConfig } from '../../types';

interface HistoryCommand {
  label: string;
  hint?: string;
  run: () => void;
  disabled?: boolean;
}

export const TopBarHistoryControls = ({
  label,
  undoCommand,
  redoCommand,
}: {
  label: string;
  undoCommand: HistoryCommand;
  redoCommand: HistoryCommand;
}) => <div className="topbar-history-cluster" role="group" aria-label={label}>
  <IconButton
    variant="secondary"
    className="icon-button topbar-undo-button"
    label={undoCommand.label}
    title={undoCommand.hint}
    onClick={undoCommand.run}
    disabled={undoCommand.disabled}
  ><Undo2 size={18} /></IconButton>
  <IconButton
    variant="secondary"
    className="icon-button topbar-redo-button"
    label={redoCommand.label}
    title={redoCommand.hint}
    onClick={redoCommand.run}
    disabled={redoCommand.disabled}
  ><Redo2 size={18} /></IconButton>
</div>;

const PDELTA_FIELDS: Array<{ key: keyof PDeltaConfig; labelKey: TranslationKey; step?: number }> = [
  { key: 'maxLoadSteps', labelKey: 'pdelta.maxLoadSteps', step: 1 },
  { key: 'maxIterationsPerStep', labelKey: 'pdelta.maxIterationsPerStep', step: 1 },
  { key: 'equilibriumTolerance', labelKey: 'pdelta.equilibriumTolerance' },
  { key: 'displacementTolerance', labelKey: 'pdelta.displacementTolerance' },
  { key: 'stepReductionFactor', labelKey: 'pdelta.stepReductionFactor' },
  { key: 'minimumStep', labelKey: 'pdelta.minimumStep' },
];

export const PDeltaAdvancedConfig = () => {
  const { project, updateProjectAnalysisSettings } = useProjectModel();
  const { t } = useI18n();
  const config = { ...DEFAULT_PDELTA_CONFIG, ...project.settings.pDeltaConfig };
  const setField = (key: keyof PDeltaConfig, value: number) => {
    if (!Number.isFinite(value)) return;
    updateProjectAnalysisSettings((settings) => ({
      ...settings,
      pDeltaConfig: { ...settings.pDeltaConfig, [key]: value },
    }));
  };
  return <details className="pdelta-advanced-details">
    <summary>{t('pdelta.advancedConfig')}</summary>
    <div className="pdelta-advanced-content">
      {PDELTA_FIELDS.map(({ key, labelKey, step }) => <label className="mobile-menu-field" key={key}>
        <span>{t(labelKey)}</span>
        <input type="number" value={config[key]} step={step ?? 'any'} onChange={(event) => setField(key, event.target.valueAsNumber)} />
      </label>)}
    </div>
  </details>;
};
