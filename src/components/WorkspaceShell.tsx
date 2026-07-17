import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Inspector } from './Inspector';
import { ResultsPanel } from './ResultsPanel';
import { StructuralCanvas } from './StructuralCanvas';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { useI18n } from '../i18n/useI18n';

export const WorkspaceShell = ({ onOpenHome, projectId }: { onOpenHome: () => void; projectId: string }) => {
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const closeMobileInspector = () => {
    setMobileInspectorOpen(false);
    window.requestAnimationFrame(() => inspectorToggleRef.current?.focus());
  };

  const openMobileInspector = () => {
    window.dispatchEvent(new CustomEvent('structureco:collapse-mobile-results'));
    setMobileInspectorOpen(true);
  };

  useEffect(() => {
    if (!mobileInspectorOpen) return undefined;
    const background = shellRef.current?.querySelectorAll<HTMLElement>('.topbar, .toolbar, .center-stage');
    background?.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
    return () => background?.forEach((element) => {
      element.inert = false;
      element.removeAttribute('aria-hidden');
    });
  }, [mobileInspectorOpen]);

  return <div ref={shellRef} className="app-shell workspace-screen" data-project-id={projectId}>
    <TopBar onOpenHome={onOpenHome} />
    <div className="workspace">
      <ToolBar />
      <main className="center-stage">
        <StructuralCanvas onRequestInspector={() => {
          if (window.matchMedia('(max-width: 960px)').matches) openMobileInspector();
        }} />
        <ResultsPanel />
      </main>
      {mobileInspectorOpen ? <button className="mobile-inspector-backdrop" aria-hidden="true" tabIndex={-1} onClick={closeMobileInspector} /> : null}
      <Inspector className={mobileInspectorOpen ? 'mobile-open' : ''} modal={mobileInspectorOpen} onClose={closeMobileInspector} />
      {!mobileInspectorOpen ? <button
        ref={inspectorToggleRef}
        className="mobile-inspector-toggle"
        onClick={openMobileInspector}
        aria-label={t('inspector.open')}
        aria-expanded="false"
      >
        <SlidersHorizontal size={20} />
      </button> : null}
    </div>
    <div className="professional-note">{t('app.professionalNote')}</div>
  </div>;
};

export default WorkspaceShell;
