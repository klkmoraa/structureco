import { Check, CloudOff, Crosshair } from 'lucide-react';
import type { RefObject } from 'react';
import { unitLabel } from '../../engine/units';
import type { Tool } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import { useProjectAnalysis } from '../../store/ProjectAnalysisContext';
import { useProjectModel } from '../../store/ProjectModelContext';
import { useWorkspaceUI } from '../../store/WorkspaceUIContext';
import { emitWorkspaceCommand } from './workspaceCommands';
import { AnalysisStatus } from '../topbar/AnalysisStatus';

const TOOL_LABELS: Record<Tool, TranslationKey> = {
  select: 'toolbar.select',
  pan: 'toolbar.pan',
  node: 'toolbar.node',
  member: 'toolbar.member',
  support: 'toolbar.support',
  pointLoad: 'toolbar.pointLoad',
  distributedLoad: 'toolbar.distributedLoad',
  moment: 'toolbar.moment',
  dimension: 'toolbar.dimension',
  cut: 'toolbar.cut',
  split: 'toolbar.split',
  delete: 'toolbar.delete',
};

export interface InstrumentProps {
  coordinateReadoutRef?: RefObject<HTMLOutputElement | null>;
  scaleReadoutRef?: RefObject<HTMLOutputElement | null>;
}

/**
 * The live measurement strip for the workspace. It is deliberately a sibling
 * of the canvas: the canvas paints structure, while this strip names the
 * current reading, model census, persistence and analysis health.
 */
export const Instrument = ({ coordinateReadoutRef, scaleReadoutRef }: InstrumentProps) => {
  const { project, storageIssue, storageMessage } = useProjectModel();
  const { analysis, isAnalyzing } = useProjectAnalysis();
  const { activeTool } = useWorkspaceUI();
  const { t } = useI18n();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const storageState = storageIssue === 'load-failed'
    ? 'load-error'
    : storageIssue === 'save-failed'
      ? 'save-error'
      : storageIssue === 'conflict'
        ? 'conflict'
        : storageIssue === 'repository-degraded'
          ? 'repository-error'
          : !online
            ? 'offline'
            : storageIssue === 'recovered'
              ? 'recovered'
              : 'local';
  const storageHasIssue = ['load-error', 'save-error', 'repository-error', 'conflict', 'offline'].includes(storageState);
  const storageLabel = storageState === 'load-error'
    ? t('storage.loadFailedShort')
    : storageState === 'save-error'
      ? t('storage.failedShort')
      : storageState === 'recovered'
        ? t('storage.recoveredShort')
        : storageState === 'offline'
          ? t('storage.offline')
          : t('storage.local');
  const counts = {
    nodes: project.nodes.length,
    members: project.members.length,
    loads: project.nodalLoads.length + project.memberLoads.length,
  };

  return <footer className="workspace-instrument" aria-label={t('canvas.viewStatus')} data-instrument="true">
    <div className="instrument-readout instrument-readout--coordinates">
      <Crosshair size={13} aria-hidden="true" />
      <output ref={coordinateReadoutRef} aria-label={t('canvas.coordinates')}>X — · Y — {unitLabel(project.settings.units, 'length')}</output>
      <output ref={scaleReadoutRef} className="instrument-scale-output" aria-label={t('canvas.scale')}>1.00×</output>
    </div>
    <div className="instrument-census" aria-label={t('overview.region')}>
      <span title={t('inspector.nodes')}><b>{counts.nodes}</b> N</span>
      <span title={t('inspector.members')}><b>{counts.members}</b> B</span>
      <span title={t('inspector.loadsTab')}><b>{counts.loads}</b> C</span>
    </div>
    <span className="instrument-tool" title={t(TOOL_LABELS[activeTool])}>{t(TOOL_LABELS[activeTool])}</span>
    <div className="instrument-health">
      <AnalysisStatus
        projectId={project.id}
        analysis={analysis}
        isAnalyzing={isAnalyzing}
        onOpenModelDoctor={() => emitWorkspaceCommand('open-model-doctor')}
      />
      <div className={`instrument-storage${storageHasIssue ? ' is-issue' : ''}`} data-storage-state={storageState} title={storageMessage ?? storageLabel} role="status" aria-label={storageLabel}>
        {storageHasIssue ? <CloudOff size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
        <span>{storageLabel}</span>
      </div>
    </div>
  </footer>;
};
