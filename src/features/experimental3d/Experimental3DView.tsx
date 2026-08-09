import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Home, Maximize2, Minus, PencilRuler, Plus, RotateCcw, ScanLine, TriangleAlert } from 'lucide-react';
import { BrandMark } from '../topbar/BrandMark';
import { useI18n } from '../../i18n/useI18n';
import type { ProjectModel } from '../../types';
import { buildExperimental3DScene, type Experimental3DDiagnostic } from './sceneModel';
import { Experimental3DCanvas, type Experimental3DCameraAction, type Experimental3DCameraCommand } from './Experimental3DCanvas';
import { createThreeViewportController } from './threeViewport';
import './experimental3d.css';

interface Experimental3DViewProps {
  project: ProjectModel;
  onOpenWorkspace: () => void;
  onOpenHome: () => void;
}

const formatRange = (min: number, max: number, language: 'es' | 'en') => {
  const formatter = new Intl.NumberFormat(language, { maximumFractionDigits: 3 });
  return `${formatter.format(min)} – ${formatter.format(max)}`;
};

export const Experimental3DView = ({ project, onOpenWorkspace, onOpenHome }: Experimental3DViewProps) => {
  const { language, t } = useI18n();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  const sceneModel = useMemo(() => buildExperimental3DScene(project), [project]);
  const commandId = useRef(0);
  const [cameraCommand, setCameraCommand] = useState<Experimental3DCameraCommand | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const sendCameraCommand = (action: Experimental3DCameraAction) => {
    commandId.current += 1;
    setCameraCommand({ id: commandId.current, action });
  };
  const diagnosticText = (diagnostic: Experimental3DDiagnostic) => diagnostic.code === 'invalid-node-coordinate'
    ? t('experimental3d.invalidNode', { id: diagnostic.nodeId })
    : t('experimental3d.unresolvedMember', { id: diagnostic.memberId, nodes: diagnostic.nodeIds.join(', ') });

  return <main className="experimental-3d-screen" data-testid="experimental-3d-screen">
    <header className="experimental-3d-header">
      <div className="experimental-3d-brand">
        <BrandMark size={34} />
        <span><strong>structureCo</strong><small>{project.name}</small></span>
      </div>
      <div className="experimental-3d-heading">
        <span className="experimental-3d-status"><Box size={14} aria-hidden="true" />{t('experimental3d.badge')}</span>
        <h1>{t('experimental3d.title')}</h1>
      </div>
      <nav className="experimental-3d-destinations" aria-label={t('experimental3d.title')}>
        <button type="button" onClick={onOpenWorkspace}><PencilRuler size={17} aria-hidden="true" />{t('experimental3d.editor2D')}</button>
        <button type="button" onClick={onOpenHome}><Home size={17} aria-hidden="true" />{t('experimental3d.home')}</button>
      </nav>
    </header>

    <p className="experimental-3d-warning"><TriangleAlert size={18} aria-hidden="true" />{t('experimental3d.warning')}</p>

    <div className="experimental-3d-layout">
      <section className="experimental-3d-stage" aria-labelledby="experimental-3d-stage-title">
        <h2 id="experimental-3d-stage-title" className="sr-only">{t('experimental3d.canvasLabel')}</h2>
        <div className="experimental-3d-viewport">
          <Experimental3DCanvas
            model={sceneModel}
            label={t('experimental3d.canvasLabel')}
            command={cameraCommand}
            createController={createThreeViewportController}
            onAvailabilityChange={setWebglUnavailable}
            fallbackCopy={{
              title: t('experimental3d.webglTitle'),
              body: t('experimental3d.webglBody'),
              retry: t('experimental3d.retry'),
            }}
          />
          {sceneModel.nodes.length === 0 && !webglUnavailable ? <div className="experimental-3d-empty">
            <Box size={32} aria-hidden="true" />
            <strong>{t('experimental3d.emptyTitle')}</strong>
            <p>{t('experimental3d.emptyBody')}</p>
            <button type="button" onClick={onOpenWorkspace}>{t('experimental3d.editor2D')}</button>
          </div> : null}
        </div>
        <p className="experimental-3d-help">{t('experimental3d.interactionHelp')}</p>
        <div className="experimental-3d-camera-controls" role="toolbar" aria-label={t('canvas.viewControls')}>
          <button type="button" onClick={() => sendCameraCommand('front')}><ScanLine size={17} aria-hidden="true" />{t('experimental3d.frontView')}</button>
          <button type="button" onClick={() => sendCameraCommand('isometric')}><Maximize2 size={17} aria-hidden="true" />{t('experimental3d.isometricView')}</button>
          <button type="button" onClick={() => sendCameraCommand('zoom-in')} aria-label={t('experimental3d.zoomIn')}><Plus size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => sendCameraCommand('zoom-out')} aria-label={t('experimental3d.zoomOut')}><Minus size={17} aria-hidden="true" /></button>
          <button type="button" onClick={() => sendCameraCommand('reset')}><RotateCcw size={17} aria-hidden="true" />{t('experimental3d.resetView')}</button>
        </div>
      </section>

      <aside className="experimental-3d-summary" role="region" aria-labelledby="experimental-3d-summary-title">
        <h2 id="experimental-3d-summary-title">{t('experimental3d.summaryTitle')}</h2>
        <dl>
          <div><dt>{t('experimental3d.project')}</dt><dd>{project.name}</dd></div>
          <div><dt>{t('experimental3d.units')}</dt><dd>{project.settings.units}</dd></div>
          <div><dt>{t('experimental3d.nodes')}</dt><dd>{sceneModel.nodes.length}</dd></div>
          <div><dt>{t('experimental3d.members')}</dt><dd>{sceneModel.members.length}</dd></div>
          <div><dt>{t('experimental3d.bounds')}</dt><dd>X {formatRange(sceneModel.bounds.min[0], sceneModel.bounds.max[0], language)}<br />Y {formatRange(sceneModel.bounds.min[1], sceneModel.bounds.max[1], language)}</dd></div>
        </dl>
        {sceneModel.diagnostics.length > 0 ? <div className="experimental-3d-diagnostics">
          <h3>{t('experimental3d.diagnostics')}</h3>
          <ul>{sceneModel.diagnostics.map((diagnostic, index) => <li key={`${diagnostic.code}-${index}`}>{diagnosticText(diagnostic)}</li>)}</ul>
        </div> : null}
      </aside>
    </div>
  </main>;
};

export default Experimental3DView;
