import { useEffect, useReducer, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Inspector } from './Inspector';
import { ResultsPanel } from './ResultsPanel';
import { StructuralCanvas } from './StructuralCanvas';
import { ToolBar } from './ToolBar';
import { TopBar } from './TopBar';
import { useI18n } from '../i18n/useI18n';
import { createEditorLayerState, editorLayerReducer } from './editorLayers';
import { AppShellLayout } from '../shell/AppShellLayout';
import { useWorkspaceLayoutPreferences } from '../shell/useWorkspaceLayoutPreferences';
import '../ui/ui.css';

export const WorkspaceShell = ({ onOpenHome, projectId }: { onOpenHome: () => void; projectId: string }) => {
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [editorLayers, dispatchEditorLayers] = useReducer(editorLayerReducer, undefined, createEditorLayerState);
  const inspectorToggleRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { preferences: layout, setPreference, togglePreference } = useWorkspaceLayoutPreferences();

  useEffect(() => {
    dispatchEditorLayers({ type: 'reset' });
  }, [projectId]);

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

  return <AppShellLayout
    ref={shellRef}
    projectId={projectId}
    skipLabel={t('shell.skipToCanvas')}
    inspectorCollapsed={layout.inspectorCollapsed}
    fullCanvas={layout.fullCanvas}
    toolRailCompact={layout.toolRailCompact}
    topBar={<TopBar
      onOpenHome={onOpenHome}
      layoutActions={{
        inspectorCollapsed: layout.inspectorCollapsed,
        fullCanvas: layout.fullCanvas,
        onToggleInspector: () => {
          setMobileInspectorOpen(false);
          if (layout.fullCanvas) {
            setPreference('fullCanvas', false);
            setPreference('inspectorCollapsed', false);
            return;
          }
          togglePreference('inspectorCollapsed');
        },
        onToggleFullCanvas: () => {
          setMobileInspectorOpen(false);
          togglePreference('fullCanvas');
        },
      }}
    />}
    toolRail={<ToolBar />}
    workspace={<>
        <StructuralCanvas layers={editorLayers} dispatchLayers={dispatchEditorLayers} onRequestInspector={() => {
          if (window.matchMedia('(max-width: 1023px)').matches) openMobileInspector();
        }} />
        <ResultsPanel />
      </>}
    backdrop={mobileInspectorOpen ? <button className="mobile-inspector-backdrop" aria-hidden="true" tabIndex={-1} onClick={closeMobileInspector} /> : null}
    inspector={<Inspector className={mobileInspectorOpen ? 'mobile-open' : ''} modal={mobileInspectorOpen} onClose={closeMobileInspector} />}
    floatingActions={!mobileInspectorOpen ? <button
        ref={inspectorToggleRef}
        className="mobile-inspector-toggle"
        onClick={openMobileInspector}
        aria-label={t('inspector.open')}
        aria-expanded="false"
      >
        <SlidersHorizontal size={20} />
      </button> : null}
    footer={<div className="professional-note">{t('app.professionalNote')}</div>}
  />;
};

export default WorkspaceShell;
