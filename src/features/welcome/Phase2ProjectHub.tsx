import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { ProjectHub } from '../project-hub/ProjectHub';

export const Phase2ProjectHub = ({ onOpenWorkspace, variant = 'full', limit }: { onOpenWorkspace: () => void; variant?: 'full' | 'recent'; limit?: number }) => {
  const { replaceProject } = useProject();
  const { language } = useI18n();
  return <ProjectHub variant={variant} limit={limit} onOpen={(record) => {
    replaceProject({ ...record.project, settings: { ...record.project.settings, language } }, undefined, record.revision);
    onOpenWorkspace();
  }} />;
};
