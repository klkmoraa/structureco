/**
 * Superficie Space 3D.
 *
 * Composición: cabecera de identidad, bandeja de herramientas, viewport como
 * protagonista, carril de modelo/resultados y tira de estado. En móvil el
 * lienzo se queda arriba y los paneles bajan apilados, siguiendo la regla del
 * brandbook «canvas primero en móvil».
 *
 * El módulo trae su propio `Space3DProjectProvider`: es la superficie completa
 * y lo único que la aplicación necesita cargar de forma diferida.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Box, ChevronLeft, CircleStop, Download, Grid3x3, Home, Layers, Move3d,
  PenLine, Play, Plus, Redo2, Sparkles, Spline, Tag, Undo2, Upload, Weight,
} from 'lucide-react';
import { Space3DProjectProvider, useSpace3DProject, type Space3DSelection } from '../../space3d/store/Space3DProjectContext';
import { Space3DCanvas, type Space3DViewportFactory } from '../../space3d/view/Space3DCanvas';
import { buildSpace3DSceneModel } from '../../space3d/view/sceneModel';
import { SPACE3D_DEFAULT_LAYERS, type Space3DLayerVisibility } from '../../space3d/view/threeViewport';
import { Space3DEntityEditor, type Space3DEditorTarget } from './Space3DEntityEditor';
import { Space3DResultsPanel, type Space3DResultsTab } from './Space3DResultsPanel';
import { translate, type Language, type TranslationKey } from '../../i18n/catalogs';
import { BrandMark } from '../topbar/BrandMark';
import type { Space3DCommand } from '../../space3d/data/commands';
import type { Space3DRestraints } from '../../space3d/model/types';
import type { Space3DStorageLike } from '../../space3d/data/storage';
import type { Space3DWorkerClient } from '../../space3d/runtime/workerClient';
import './space3d.css';

export interface Space3DWorkspaceProps {
  readonly language: Language;
  readonly onOpenHome?: () => void;
  readonly onOpen2D?: () => void;
  readonly onOpenPlanarPreview?: () => void;
  readonly storage?: Space3DStorageLike | null;
  readonly client?: Space3DWorkerClient;
  readonly createViewport?: Space3DViewportFactory;
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  'duplicate-id': 'space3d.error.duplicateId',
  'empty-id': 'space3d.error.emptyId',
  'missing-entity': 'space3d.error.missingEntity',
  'node-in-use': 'space3d.error.nodeInUse',
  'self-referential': 'space3d.error.selfReferential',
  'invalid-value': 'space3d.error.invalidValue',
  'limit-exceeded': 'space3d.error.limitExceeded',
  'invalid-result': 'space3d.error.invalidResult',
  'malformed-json': 'space3d.error.malformedJson',
  'analysis-space': 'space3d.error.analysisSpace',
  'schema-version': 'space3d.error.schemaVersion',
  'unknown-field': 'space3d.error.unknownField',
  'invalid-model': 'space3d.error.invalidModel',
  'analysis-failed': 'space3d.error.analysisFailed',
};

/** Códigos de issue del solver traducidos para el aviso de la superficie. */
const ANALYSIS_ISSUE_KEYS: Record<string, TranslationKey> = {
  mechanism: 'space3d.error.mechanism',
  'no-free-dof': 'space3d.error.noFreeDof',
  'empty-model': 'space3d.error.emptyModel',
  'unknown-target': 'space3d.error.unknownTarget',
  'non-finite-solution': 'space3d.error.analysisFailed',
  'missing-reference': 'space3d.error.missingEntity',
  'invalid-property': 'space3d.error.invalidValue',
  'invalid-coordinate': 'space3d.error.invalidValue',
  'degenerate-length': 'space3d.error.invalidValue',
  'degenerate-orientation': 'space3d.error.invalidValue',
  'missing-case': 'space3d.error.missingEntity',
  'duplicate-id': 'space3d.error.duplicateId',
  'limit-exceeded': 'space3d.error.limitExceeded',
};

const STATE_KEYS: Record<string, TranslationKey> = {
  idle: 'space3d.stateIdle',
  running: 'space3d.stateRunning',
  ready: 'space3d.stateReady',
  stale: 'space3d.stateStale',
  failed: 'space3d.stateFailed',
  cancelled: 'space3d.stateCancelled',
};

const STATE_TONES: Record<string, string> = {
  idle: 'neutral', running: 'loading', ready: 'ok', stale: 'warn', failed: 'error', cancelled: 'neutral',
};

const LAYER_TOGGLES: readonly { id: keyof Space3DLayerVisibility; key: TranslationKey; Icon: typeof Grid3x3 }[] = [
  { id: 'grid', key: 'space3d.layerGrid', Icon: Grid3x3 },
  { id: 'loads', key: 'space3d.layerLoads', Icon: Weight },
  { id: 'supports', key: 'space3d.layerSupports', Icon: ChevronLeft },
  { id: 'labels', key: 'space3d.layerLabels', Icon: Tag },
  { id: 'deformed', key: 'space3d.layerDeformed', Icon: Spline },
];

const number = (value: number, digits = 3): string => {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) >= 1e-3 || value === 0 ? value.toFixed(digits).replace(/\.?0+$/, '') || '0' : value.toExponential(2);
};

const countRestraints = (restraints: Space3DRestraints) => Object.values(restraints).filter(Boolean).length;

const WorkspaceBody = ({
  language, onOpenHome, onOpen2D, onOpenPlanarPreview, createViewport,
}: Pick<Space3DWorkspaceProps, 'language' | 'onOpenHome' | 'onOpen2D' | 'onOpenPlanarPreview' | 'createViewport'>) => {
  const t = useCallback(
    (key: TranslationKey, variables?: Record<string, string | number>) => translate(language, key, variables),
    [language],
  );

  const {
    project, analysis, analysisState, analysisTargetId, selectedEntity, canUndo, canRedo, lastError,
    execute, undo, redo, analyze, cancelAnalysis, select, importPortable, exportPortable, loadExample, resetToBlank,
  } = useSpace3DProject();

  const [layers, setLayers] = useState<Space3DLayerVisibility>(SPACE3D_DEFAULT_LAYERS);
  const [rail, setRail] = useState<'model' | 'results'>('model');
  const [resultsTab, setResultsTab] = useState<Space3DResultsTab>('summary');
  const [editorTarget, setEditorTarget] = useState<Space3DEditorTarget | null>(null);
  const [transfer, setTransfer] = useState<'import' | 'export' | null>(null);
  const [importText, setImportText] = useState('');

  const scene = useMemo(() => buildSpace3DSceneModel({
    project, analysis, analysisState, selection: selectedEntity, targetId: analysisTargetId,
  }), [analysis, analysisState, analysisTargetId, project, selectedEntity]);

  const submit = useCallback((command: Space3DCommand) => execute(command).ok, [execute]);

  const selectEntity = useCallback((selection: Space3DSelection | null) => {
    select(selection);
    setEditorTarget(selection ? { kind: selection.kind, id: selection.id } : null);
  }, [select]);

  const openNew = (kind: Space3DEditorTarget['kind']) => {
    select(null);
    setRail('model');
    setEditorTarget({ kind, id: null });
  };

  const remove = (target: Space3DEditorTarget) => {
    if (!target.id) return;
    const command: Space3DCommand = target.kind === 'node'
      ? { kind: 'delete-node', nodeId: target.id }
      : target.kind === 'member'
        ? { kind: 'delete-member', memberId: target.id }
        : { kind: 'delete-nodal-load', loadId: target.id };
    if (execute(command).ok) {
      select(null);
      setEditorTarget(null);
    }
  };

  const running = analysisState === 'running';
  const errorMessage = lastError ? t(ERROR_KEYS[lastError] ?? 'space3d.error.generic') : null;

  return <div className="space3d-screen">
    <header className="space3d-header">
      <div className="space3d-identity">
        <BrandMark size={30} />
        <span>
          <strong>{t('space3d.title')}</strong>
          <small>{t('space3d.subtitle')}</small>
        </span>
        <span className="space3d-badge">{t('space3d.badge')}</span>
      </div>
      <nav className="space3d-destinations" aria-label={t('space3d.title')}>
        {onOpenHome ? <button type="button" className="space3d-button" onClick={onOpenHome}><Home size={16} aria-hidden="true" />{t('space3d.home')}</button> : null}
        {onOpen2D ? <button type="button" className="space3d-button" onClick={onOpen2D}><PenLine size={16} aria-hidden="true" />{t('space3d.editor2D')}</button> : null}
        {onOpenPlanarPreview ? <button type="button" className="space3d-button" onClick={onOpenPlanarPreview}><Box size={16} aria-hidden="true" />{t('space3d.planarPreview')}</button> : null}
      </nav>
    </header>

    <p className="space3d-experimental" role="note">{t('space3d.experimentalNotice')}</p>

    <div className="space3d-toolbar">
      <div className="space3d-tray" role="group" aria-label={t('space3d.toolbarModel')}>
        <button type="button" className="space3d-tool space3d-tool--wide" onClick={() => openNew('node')}>
          <Plus size={16} aria-hidden="true" />{t('space3d.newNode')}
        </button>
        <button type="button" className="space3d-tool space3d-tool--wide" onClick={() => openNew('member')} disabled={project.nodes.length < 2}>
          <Move3d size={16} aria-hidden="true" />{t('space3d.newMember')}
        </button>
        <button type="button" className="space3d-tool space3d-tool--wide" onClick={() => openNew('load')} disabled={project.nodes.length === 0}>
          <Weight size={16} aria-hidden="true" />{t('space3d.newLoad')}
        </button>
      </div>

      <div className="space3d-tray" role="group" aria-label={t('space3d.toolbarProject')}>
        <button type="button" className="space3d-tool" onClick={undo} disabled={!canUndo} title={t('space3d.undo')}>
          <Undo2 size={16} aria-hidden="true" /><span className="space3d-visually-hidden">{t('space3d.undo')}</span>
        </button>
        <button type="button" className="space3d-tool" onClick={redo} disabled={!canRedo} title={t('space3d.redo')}>
          <Redo2 size={16} aria-hidden="true" /><span className="space3d-visually-hidden">{t('space3d.redo')}</span>
        </button>
        <button type="button" className="space3d-tool" onClick={() => { loadExample(); setEditorTarget(null); }}>
          <Sparkles size={16} aria-hidden="true" />{t('space3d.loadExample')}
        </button>
        <button type="button" className="space3d-tool" onClick={() => { resetToBlank(); setEditorTarget(null); }}>
          {t('space3d.resetBlank')}
        </button>
        <button type="button" className="space3d-tool" onClick={() => setTransfer('import')}>
          <Upload size={16} aria-hidden="true" />{t('space3d.import')}
        </button>
        <button type="button" className="space3d-tool" onClick={() => setTransfer('export')}>
          <Download size={16} aria-hidden="true" />{t('space3d.export')}
        </button>
      </div>

      <div className="space3d-tray space3d-tray--layers" role="group" aria-label={t('space3d.layers')}>
        <Layers size={15} aria-hidden="true" />
        {LAYER_TOGGLES.map(({ id, key, Icon }) => <button
          key={id}
          type="button"
          className="space3d-tool space3d-tool--toggle"
          aria-pressed={layers[id]}
          onClick={() => setLayers((current) => ({ ...current, [id]: !current[id] }))}
          title={t(key)}
        >
          <Icon size={15} aria-hidden="true" />
          <span className="space3d-visually-hidden">{t(key)}</span>
        </button>)}
      </div>

      <div className="space3d-tray space3d-tray--run" role="group" aria-label={t('space3d.analyze')}>
        <button type="button" className="space3d-button space3d-button--primary" onClick={() => { void analyze(); }} disabled={running}>
          <Play size={16} aria-hidden="true" />{running ? t('space3d.analyzing') : t('space3d.analyze')}
        </button>
        <button type="button" className="space3d-tool" onClick={cancelAnalysis} disabled={!running} title={t('space3d.cancelAnalysis')}>
          <CircleStop size={16} aria-hidden="true" /><span className="space3d-visually-hidden">{t('space3d.cancelAnalysis')}</span>
        </button>
      </div>
    </div>

    {errorMessage ? <p className="space3d-notice space3d-notice--error" role="alert">{errorMessage}</p> : null}

    {/* El motivo del fallo se publica junto a la acción que lo provocó, no
        escondido tras una pestaña: quien pulsa «Analizar» tiene que ver por qué
        no salió sin ir a buscarlo. */}
    {analysisState === 'failed' && analysis && analysis.issues.length > 0
      ? <div className="space3d-notice space3d-notice--error" role="alert">
        <strong>{t('space3d.analysisIssues')}</strong>
        <ul className="space3d-issue-line">
          {analysis.issues.slice(0, 4).map((issue, index) => <li key={`${issue.code}-${issue.entityId}-${index}`}>
            <code>{issue.code}</code> {t(ANALYSIS_ISSUE_KEYS[issue.code] ?? 'space3d.error.generic')}
          </li>)}
        </ul>
      </div>
      : null}

    <div className="space3d-layout">
      <section className="space3d-stage" aria-label={t('space3d.canvasLabel')}>
        <Space3DCanvas
          model={scene}
          layers={layers}
          onSelect={selectEntity}
          createViewport={createViewport}
          viewLabels={{
            front: t('space3d.viewFront'),
            top: t('space3d.viewTop'),
            side: t('space3d.viewSide'),
            isometric: t('space3d.viewIsometric'),
          }}
          zoomInLabel={t('space3d.zoomIn')}
          zoomOutLabel={t('space3d.zoomOut')}
          resetLabel={t('space3d.resetView')}
          copy={{
            label: t('space3d.canvasLabel'),
            fallbackTitle: t('space3d.webglTitle'),
            fallbackBody: t('space3d.webglBody'),
            retry: t('space3d.retry'),
            summaryTitle: t('space3d.canvasSummary'),
            nodes: t('space3d.nodes'),
            members: t('space3d.members'),
            supports: t('space3d.supports'),
            loads: t('space3d.loads'),
          }}
        />
        <p className="space3d-help">{t('space3d.interactionHelp')}</p>
      </section>

      <aside className="space3d-rail">
        <div className="space3d-tabs space3d-tray" role="tablist" aria-label={t('space3d.title')}>
          <button type="button" role="tab" className="space3d-tab" aria-selected={rail === 'model'} onClick={() => setRail('model')}>{t('space3d.tabModel')}</button>
          <button type="button" role="tab" className="space3d-tab" aria-selected={rail === 'results'} onClick={() => setRail('results')}>{t('space3d.tabResults')}</button>
        </div>

        {rail === 'model' ? <div className="space3d-rail-body">
          {scene.isEmpty ? <div className="space3d-empty">
            <strong>{t('space3d.emptyModelTitle')}</strong>
            <p>{t('space3d.emptyModelBody')}</p>
          </div> : null}

          <div className="space3d-table-scroll">
            <table className="space3d-table" aria-label={t('space3d.nodes')}>
              <thead>
                <tr>
                  <th scope="col">{t('space3d.node')}</th>
                  <th scope="col">X</th><th scope="col">Y</th><th scope="col">Z</th>
                  <th scope="col">{t('space3d.restraints')}</th>
                </tr>
              </thead>
              <tbody>
                {project.nodes.map((node) => <tr key={node.id} aria-selected={selectedEntity?.kind === 'node' && selectedEntity.id === node.id}>
                  <th scope="row">
                    <button type="button" className="space3d-linkish" onClick={() => selectEntity({ kind: 'node', id: node.id })}>{node.id}</button>
                  </th>
                  <td>{number(node.x)}</td><td>{number(node.y)}</td><td>{number(node.z)}</td>
                  <td>{countRestraints(node.restraints)}</td>
                </tr>)}
              </tbody>
            </table>
            {project.nodes.length === 0 ? <p className="space3d-notice">{t('space3d.emptyNodes')}</p> : null}
          </div>

          <div className="space3d-table-scroll">
            <table className="space3d-table" aria-label={t('space3d.members')}>
              <thead>
                <tr>
                  <th scope="col">{t('space3d.member')}</th>
                  <th scope="col">{t('space3d.endI')}</th>
                  <th scope="col">{t('space3d.endJ')}</th>
                  <th scope="col">A</th><th scope="col">Iz</th>
                </tr>
              </thead>
              <tbody>
                {project.members.map((member) => <tr key={member.id}>
                  <th scope="row">
                    <button type="button" className="space3d-linkish" onClick={() => selectEntity({ kind: 'member', id: member.id })}>{member.id}</button>
                  </th>
                  <td>{member.i}</td><td>{member.j}</td>
                  <td>{member.A}</td><td>{member.Iz}</td>
                </tr>)}
              </tbody>
            </table>
            {project.members.length === 0 ? <p className="space3d-notice">{t('space3d.emptyMembers')}</p> : null}
          </div>

          <div className="space3d-table-scroll">
            <table className="space3d-table" aria-label={t('space3d.loads')}>
              <thead>
                <tr>
                  <th scope="col">{t('space3d.load')}</th>
                  <th scope="col">{t('space3d.node')}</th>
                  <th scope="col">Fx</th><th scope="col">Fy</th><th scope="col">Fz</th>
                </tr>
              </thead>
              <tbody>
                {project.nodalLoads.map((load) => <tr key={load.id}>
                  <th scope="row">
                    <button type="button" className="space3d-linkish" onClick={() => selectEntity({ kind: 'load', id: load.id })}>{load.id}</button>
                  </th>
                  <td>{load.nodeId}</td>
                  <td>{number(load.fx)}</td><td>{number(load.fy)}</td><td>{number(load.fz)}</td>
                </tr>)}
              </tbody>
            </table>
            {project.nodalLoads.length === 0 ? <p className="space3d-notice">{t('space3d.emptyLoads')}</p> : null}
          </div>

          {editorTarget
            ? <Space3DEntityEditor
              project={project}
              target={editorTarget}
              t={t}
              onSubmit={submit}
              onCancel={() => setEditorTarget(null)}
              onDelete={remove}
            />
            : <p className="space3d-notice">{t('space3d.noSelection')}</p>}
        </div> : <div className="space3d-rail-body">
          <Space3DResultsPanel
            analysis={analysis}
            analysisState={analysisState}
            tab={resultsTab}
            onTabChange={setResultsTab}
            deformationScale={scene.deformed?.scale ?? null}
            maxDisplacement={scene.deformed?.maxDisplacement ?? null}
            t={t}
            onSelectNode={(id) => selectEntity({ kind: 'node', id })}
            onSelectMember={(id) => selectEntity({ kind: 'member', id })}
          />
        </div>}
      </aside>
    </div>

    {transfer ? <div className="space3d-transfer" role="group" aria-label={transfer === 'import' ? t('space3d.import') : t('space3d.export')}>
      <label className="space3d-field">
        <span className="space3d-field-label">{transfer === 'import' ? t('space3d.transferImportLabel') : t('space3d.transferExportLabel')}</span>
        <textarea
          rows={6}
          spellCheck={false}
          readOnly={transfer === 'export'}
          placeholder={transfer === 'import' ? t('space3d.importPlaceholder') : undefined}
          value={transfer === 'export' ? exportPortable() : importText}
          onChange={(event) => setImportText(event.target.value)}
        />
      </label>
      <div className="space3d-inline-actions">
        {transfer === 'import' ? <button
          type="button"
          className="space3d-button space3d-button--primary"
          onClick={() => {
            if (importPortable(importText).ok) {
              setTransfer(null);
              setImportText('');
              setEditorTarget(null);
            }
          }}
        >{t('space3d.importConfirm')}</button> : null}
        <button type="button" className="space3d-button" onClick={() => setTransfer(null)}>{t('space3d.importCancel')}</button>
      </div>
    </div> : null}

    <footer className="space3d-status" aria-label={t('space3d.title')}>
      <span className={`space3d-state space3d-state--${STATE_TONES[analysisState]}`}>{t(STATE_KEYS[analysisState])}</span>
      <span><b>{project.nodes.length}</b> {t('space3d.nodes')}</span>
      <span><b>{project.members.length}</b> {t('space3d.members')}</span>
      <span><b>{project.nodalLoads.length}</b> {t('space3d.loads')}</span>
      <span><b>{project.nodes.length * 6}</b> {t('space3d.dofCount')}</span>
      <span>{t('space3d.analysisTarget', { id: analysisTargetId })}</span>
      <span data-testid="space3d-analysis-state" className="space3d-visually-hidden">{analysisState}</span>
      <span data-testid="space3d-deformed-visible" className="space3d-visually-hidden">{String(scene.deformed !== null)}</span>
    </footer>
  </div>;
};

const Space3DWorkspace = ({ storage, client, ...rest }: Space3DWorkspaceProps) => (
  <Space3DProjectProvider storage={storage} client={client}>
    <WorkspaceBody {...rest} />
  </Space3DProjectProvider>
);

export default Space3DWorkspace;
