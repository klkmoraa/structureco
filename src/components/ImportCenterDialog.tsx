import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileArchive,
  FileJson,
  FileText,
  LoaderCircle,
  Save,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { AnalysisResult, ProjectModel } from '../types';
import { importProjectJson } from '../utils/export';

export type ImportContentKey =
  | 'geometry'
  | 'supports'
  | 'loads'
  | 'results'
  | 'diagrams'
  | 'procedures'
  | 'attachments';

export type ImportMode = 'new' | 'replace';

export interface ImportContentOption {
  key: ImportContentKey;
  label: string;
  detail: string;
  available: boolean;
  selectedByDefault?: boolean;
}

export interface ImportInspection {
  kind: 'json' | 'pdf' | 'structureco';
  sourceLabel: string;
  version?: string;
  confidence: number;
  supported: boolean;
  summary: string;
  statistics: Array<{ label: string; value: number | string }>;
  warnings: string[];
  contents: ImportContentOption[];
  project?: ProjectModel;
  restoredAnalysis?: AnalysisResult;
}

export interface ImportOptions {
  mode: ImportMode;
  content: ImportContentKey[];
  saveCurrent: boolean;
}

export interface ImportOutcome {
  project: ProjectModel;
  restoredAnalysis?: AnalysisResult;
  title?: string;
  message?: string;
  statistics?: Array<{ label: string; value: number | string }>;
  warnings?: string[];
}

export interface ImportCenterAdapter {
  inspect: (file: File) => Promise<ImportInspection>;
  importFile: (file: File, inspection: ImportInspection, options: ImportOptions) => Promise<ImportOutcome>;
}

export interface ImportCenterDialogProps {
  open: boolean;
  currentProjectName: string;
  onClose: () => void;
  onImported: (outcome: ImportOutcome) => void;
  onSaveCurrent?: () => void | Promise<void>;
  adapter?: ImportCenterAdapter;
}

type ImportStage = 'select' | 'inspect' | 'content' | 'conflicts' | 'confirm' | 'result';

const stages: Array<{ id: ImportStage; label: string }> = [
  { id: 'select', label: 'Archivo' },
  { id: 'inspect', label: 'Inspección' },
  { id: 'content', label: 'Contenido' },
  { id: 'conflicts', label: 'Destino' },
  { id: 'confirm', label: 'Confirmar' },
  { id: 'result', label: 'Resultado' },
];

const defaultContents = (project: ProjectModel): ImportContentOption[] => [
  { key: 'geometry', label: 'Geometría y propiedades', detail: `${project.nodes.length} nodos · ${project.members.length} miembros`, available: true, selectedByDefault: true },
  { key: 'supports', label: 'Apoyos y desplazamientos', detail: `${project.nodes.filter((node) => node.support.type !== 'none').length} apoyos`, available: true, selectedByDefault: true },
  { key: 'loads', label: 'Cargas y combinaciones', detail: `${project.nodalLoads.length + project.memberLoads.length} cargas · ${project.combinations.length} combinaciones`, available: true, selectedByDefault: true },
  { key: 'results', label: 'Resultados del análisis', detail: 'No incluidos en el JSON del proyecto', available: false },
  { key: 'diagrams', label: 'DCL y diagramas N–V–M', detail: 'No incluidos en el JSON del proyecto', available: false },
  { key: 'procedures', label: 'Procedimientos y cálculos', detail: 'No incluidos en el JSON del proyecto', available: false },
  { key: 'attachments', label: 'Adjuntos', detail: 'No incluidos en el JSON del proyecto', available: false },
];

const classifyFile = (file: File): ImportInspection['kind'] => {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.structureco')) return 'structureco';
  return 'json';
};

const inspectWithJsonFallback = async (file: File): Promise<ImportInspection> => {
  const kind = classifyFile(file);
  if (kind !== 'json') {
    return {
      kind,
      sourceLabel: kind === 'pdf' ? 'Documento PDF' : 'Expediente structureCo',
      confidence: 0,
      supported: false,
      summary: kind === 'pdf'
        ? 'El centro reconoce el PDF, pero este despliegue todavía no tiene conectado el extractor de modelos y memorias de cálculo.'
        : 'El centro reconoce el expediente, pero este despliegue todavía no tiene conectado el lector de paquetes.',
      statistics: [{ label: 'Tamaño', value: formatBytes(file.size) }],
      warnings: ['Conecta un adaptador portable para inspeccionar e importar este formato sin perder información.'],
      contents: [
        { key: 'geometry', label: 'Geometría y propiedades', detail: 'Pendiente de inspección', available: false },
        { key: 'supports', label: 'Apoyos y desplazamientos', detail: 'Pendiente de inspección', available: false },
        { key: 'loads', label: 'Cargas y combinaciones', detail: 'Pendiente de inspección', available: false },
        { key: 'results', label: 'Resultados del análisis', detail: 'Pendiente de inspección', available: false },
        { key: 'diagrams', label: 'DCL y diagramas N–V–M', detail: 'Pendiente de inspección', available: false },
        { key: 'procedures', label: 'Procedimientos y cálculos', detail: 'Pendiente de inspección', available: false },
        { key: 'attachments', label: 'Adjuntos', detail: 'Pendiente de inspección', available: false },
      ],
    };
  }

  const project = await importProjectJson(file);
  const loads = project.nodalLoads.length + project.memberLoads.length;
  return {
    kind,
    sourceLabel: 'Proyecto structureCo JSON',
    version: String(project.schemaVersion),
    confidence: 100,
    supported: true,
    summary: `Proyecto “${project.name}” validado y listo para importar.`,
    statistics: [
      { label: 'Nodos', value: project.nodes.length },
      { label: 'Miembros', value: project.members.length },
      { label: 'Cargas', value: loads },
      { label: 'Casos', value: project.loadCases.length },
    ],
    warnings: project.nodes.length === 0 ? ['El proyecto no contiene nodos.'] : [],
    contents: defaultContents(project),
    project,
  };
};

// oxlint-disable-next-line react/only-export-components
export const jsonImportCenterAdapter: ImportCenterAdapter = {
  inspect: inspectWithJsonFallback,
  importFile: async (_file, inspection) => {
    if (!inspection.project) throw new Error('No hay un proyecto validado para importar.');
    return {
      project: inspection.project,
      title: 'Proyecto listo',
      message: 'La importación se completó sin modificar el archivo original.',
      statistics: inspection.statistics,
      warnings: inspection.warnings,
    };
  },
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (kind?: ImportInspection['kind']) => {
  if (kind === 'pdf') return FileText;
  if (kind === 'structureco') return FileArchive;
  return FileJson;
};

export const ImportCenterDialog = ({
  open,
  currentProjectName,
  onClose,
  onImported,
  onSaveCurrent,
  adapter = jsonImportCenterAdapter,
}: ImportCenterDialogProps) => {
  const [stage, setStage] = useState<ImportStage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [selectedContent, setSelectedContent] = useState<ImportContentKey[]>([]);
  const [mode, setMode] = useState<ImportMode>('new');
  const [saveCurrent, setSaveCurrent] = useState(Boolean(onSaveCurrent));
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setStage('select');
    setFile(null);
    setInspection(null);
    setSelectedContent([]);
    setMode('new');
    setSaveCurrent(Boolean(onSaveCurrent));
    setDragging(false);
    setError(null);
    setOutcome(null);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusHandle = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('.import-dropzone button, .import-center-close')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusHandle);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) window.requestAnimationFrame(() => previousFocus.focus());
    };
  }, [onSaveCurrent, open]);

  if (!open) return null;

  const inspectFile = async (nextFile: File) => {
    setFile(nextFile);
    setInspection(null);
    setOutcome(null);
    setError(null);
    setStage('inspect');
    try {
      const nextInspection = await adapter.inspect(nextFile);
      setInspection(nextInspection);
      setSelectedContent(nextInspection.contents.filter((item) => item.available && item.selectedByDefault !== false).map((item) => item.key));
      setStage('content');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo inspeccionar el archivo.');
      setStage('select');
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) void inspectFile(nextFile);
  };

  const runImport = async () => {
    if (!file || !inspection) return;
    setError(null);
    setStage('inspect');
    try {
      if (mode === 'replace' && saveCurrent && onSaveCurrent) await onSaveCurrent();
      const nextOutcome = await adapter.importFile(file, inspection, { mode, content: selectedContent, saveCurrent });
      setOutcome(nextOutcome);
      setStage('result');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la importación.');
      setStage('confirm');
    }
  };

  const activeIndex = stages.findIndex((item) => item.id === stage);
  const FileIcon = getFileIcon(inspection?.kind ?? (file ? classifyFile(file) : undefined));

  return (
    <div className="import-center-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="import-center-dialog" role="dialog" aria-modal="true" aria-labelledby="import-center-title" aria-describedby="import-center-subtitle">
        <header className="import-center-header">
          <div>
            <p className="import-center-eyebrow">Centro de importación</p>
            <h2 id="import-center-title">Trae un proyecto con contexto</h2>
            <p id="import-center-subtitle">Revisa el archivo antes de abrirlo y decide exactamente qué conservar.</p>
          </div>
          <button type="button" className="import-center-close" aria-label="Cerrar centro de importación" onClick={onClose}><X size={20} /></button>
        </header>

        <nav className="import-center-steps" aria-label="Progreso de importación">
          {stages.map((item, index) => (
            <span key={item.id} className={index === activeIndex ? 'active' : index < activeIndex ? 'complete' : ''} aria-current={index === activeIndex ? 'step' : undefined}>
              <i>{index < activeIndex ? <Check size={12} /> : index + 1}</i><em>{item.label}</em>
            </span>
          ))}
        </nav>

        <div className="import-center-body">
          {stage === 'select' ? (
            <section className="import-center-section" aria-labelledby="import-select-title">
              <div className="import-section-heading"><p>Paso 1</p><h3 id="import-select-title">Selecciona el expediente</h3><span>JSON, PDF o .structureco</span></div>
              <div
                className={`import-dropzone ${dragging ? 'dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
                onDrop={handleDrop}
              >
                <span className="import-dropzone-icon"><Upload size={26} /></span>
                <strong>Suelta aquí tu archivo</strong>
                <span>o selecciónalo desde Archivos, iCloud Drive o tu dispositivo</span>
                <button type="button" onClick={() => fileInputRef.current?.click()}>Elegir archivo</button>
                <input
                  ref={fileInputRef}
                  className="import-file-input"
                  type="file"
                  accept="application/json,application/pdf,.json,.pdf,.structureco,.structureco.json"
                  aria-label="Seleccionar archivo para importar"
                  onChange={(event) => {
                    const nextFile = event.currentTarget.files?.[0];
                    if (nextFile) void inspectFile(nextFile);
                    event.currentTarget.value = '';
                  }}
                />
              </div>
              <div className="import-format-grid" aria-label="Formatos compatibles">
                <article><FileJson size={19} /><div><strong>JSON structureCo</strong><span>Modelo editable y validado</span></div><b>Disponible</b></article>
                <article><FileText size={19} /><div><strong>PDF inteligente</strong><span>Modelo, DCL, N–V–M y memoria</span></div><b>Con adaptador</b></article>
                <article><FileArchive size={19} /><div><strong>Expediente .structureco</strong><span>Proyecto y entregables en un paquete</span></div><b>Con adaptador</b></article>
              </div>
            </section>
          ) : null}

          {stage === 'inspect' ? (
            <section className="import-center-loading" aria-live="polite">
              <LoaderCircle className="spin" size={31} />
              <h3>{outcome ? 'Preparando el resultado…' : 'Inspeccionando el archivo…'}</h3>
              <p>Validamos estructura, versión y contenido antes de modificar tu proyecto.</p>
            </section>
          ) : null}

          {stage === 'content' && file && inspection ? (
            <section className="import-center-section" aria-labelledby="import-content-title">
              <div className="import-file-summary">
                <span className="import-file-icon"><FileIcon size={26} /></span>
                <div><strong>{file.name}</strong><span>{inspection.sourceLabel} · {formatBytes(file.size)}{inspection.version ? ` · Esquema ${inspection.version}` : ''}</span></div>
                <span className={`import-confidence ${inspection.confidence >= 80 ? 'high' : inspection.confidence > 0 ? 'medium' : 'unknown'}`}>{inspection.confidence > 0 ? `${inspection.confidence}% confianza` : 'Por revisar'}</span>
              </div>
              <div className="import-section-heading"><p>Paso 3</p><h3 id="import-content-title">Contenido encontrado</h3><span>{inspection.summary}</span></div>
              {inspection.statistics.length ? <dl className="import-stat-grid">{inspection.statistics.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl> : null}
              {inspection.warnings.length ? <div className="import-warning-list" role="status">{inspection.warnings.map((warning) => <p key={warning}><AlertTriangle size={16} />{warning}</p>)}</div> : null}
              <fieldset className="import-content-list">
                <legend className="sr-only">Selecciona el contenido que deseas importar</legend>
                {inspection.contents.map((item) => {
                  const checked = selectedContent.includes(item.key);
                  return (
                    <label key={item.key} className={item.available ? '' : 'unavailable'}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!item.available}
                        onChange={() => setSelectedContent((current) => checked ? current.filter((key) => key !== item.key) : [...current, item.key])}
                      />
                      <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                      <em>{item.available ? (checked ? 'Incluir' : 'Omitir') : 'No detectado'}</em>
                    </label>
                  );
                })}
              </fieldset>
              {!inspection.supported ? <div className="import-blocked-message" role="alert"><AlertTriangle size={18} /><span><strong>Este formato necesita el lector portable.</strong>{inspection.summary}</span></div> : null}
            </section>
          ) : null}

          {stage === 'conflicts' && inspection ? (
            <section className="import-center-section" aria-labelledby="import-destination-title">
              <div className="import-section-heading"><p>Paso 4</p><h3 id="import-destination-title">¿Dónde quieres abrirlo?</h3><span>Tu proyecto actual es “{currentProjectName}”.</span></div>
              <div className="import-mode-options" role="radiogroup" aria-label="Destino de la importación">
                <button type="button" role="radio" aria-checked={mode === 'new'} className={mode === 'new' ? 'selected' : ''} onClick={() => setMode('new')}>
                  <span className="import-radio" /><span><strong>Abrir como proyecto nuevo</strong><small>Conserva el proyecto actual en el historial local.</small></span><b>Recomendado</b>
                </button>
                <button type="button" role="radio" aria-checked={mode === 'replace'} className={mode === 'replace' ? 'selected danger' : ''} onClick={() => setMode('replace')}>
                  <span className="import-radio" /><span><strong>Reemplazar el proyecto actual</strong><small>Sustituye el modelo que está abierto.</small></span>
                </button>
                <button type="button" role="radio" aria-checked="false" disabled aria-describedby="merge-import-help">
                  <span className="import-radio" /><span><strong>Combinar con el proyecto actual</strong><small id="merge-import-help">No disponible hasta resolver identificadores, unidades y casos duplicados con seguridad.</small></span>
                </button>
              </div>
              {mode === 'replace' ? (
                <label className={`import-save-option ${onSaveCurrent ? '' : 'disabled'}`}>
                  <input type="checkbox" checked={saveCurrent && Boolean(onSaveCurrent)} disabled={!onSaveCurrent} onChange={(event) => setSaveCurrent(event.currentTarget.checked)} />
                  <Save size={19} />
                  <span><strong>Descargar una copia antes de reemplazar</strong><small>{onSaveCurrent ? 'Generaremos un JSON del proyecto actual antes de continuar.' : 'El guardado previo no está disponible desde esta pantalla.'}</small></span>
                </label>
              ) : null}
            </section>
          ) : null}

          {stage === 'confirm' && file && inspection ? (
            <section className="import-center-section" aria-labelledby="import-confirm-title">
              <div className="import-section-heading"><p>Paso 5</p><h3 id="import-confirm-title">Confirma la importación</h3><span>Nada cambiará hasta que pulses “Importar ahora”.</span></div>
              <div className="import-confirm-card">
                <div><FileIcon size={24} /><span><strong>{file.name}</strong><small>{inspection.sourceLabel} · {formatBytes(file.size)}</small></span></div>
                <dl>
                  <div><dt>Destino</dt><dd>{mode === 'new' ? 'Proyecto nuevo' : `Reemplazar “${currentProjectName}”`}</dd></div>
                  <div><dt>Contenido</dt><dd>{selectedContent.length} de {inspection.contents.filter((item) => item.available).length} grupos</dd></div>
                  <div><dt>Copia previa</dt><dd>{mode === 'replace' && saveCurrent && onSaveCurrent ? 'Sí, descargar JSON' : 'No necesaria'}</dd></div>
                </dl>
              </div>
              <div className="import-safety-note"><ShieldCheck size={20} /><span><strong>Importación reversible</strong>El proyecto importado entra al historial; podrás deshacer el reemplazo desde el editor.</span></div>
            </section>
          ) : null}

          {stage === 'result' && outcome ? (
            <section className="import-center-result" aria-labelledby="import-result-title" aria-live="polite">
              <span className="import-result-icon"><CheckCircle2 size={32} /></span>
              <p>Paso 6</p>
              <h3 id="import-result-title">{outcome.title ?? 'Importación completada'}</h3>
              <span>{outcome.message ?? 'El contenido está listo para abrirse en el editor.'}</span>
              {outcome.statistics?.length ? <dl className="import-stat-grid">{outcome.statistics.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl> : null}
              {outcome.warnings?.length ? <div className="import-warning-list">{outcome.warnings.map((warning) => <p key={warning}><AlertTriangle size={16} />{warning}</p>)}</div> : null}
            </section>
          ) : null}

          {error ? <div className="import-error-message" role="alert"><AlertTriangle size={18} /><span><strong>No pudimos continuar</strong>{error}</span></div> : null}
        </div>

        <footer className="import-center-footer">
          <button type="button" className="import-button-secondary" onClick={() => {
            if (stage === 'select' || stage === 'result') onClose();
            else if (stage === 'content') setStage('select');
            else if (stage === 'conflicts') setStage('content');
            else if (stage === 'confirm') setStage('conflicts');
          }} disabled={stage === 'inspect'}>
            {stage === 'select' || stage === 'result' ? <X size={17} /> : <ArrowLeft size={17} />}
            {stage === 'select' ? 'Cancelar' : stage === 'result' ? 'Cerrar' : 'Atrás'}
          </button>
          {stage === 'content' ? <button type="button" className="import-button-primary" disabled={!inspection?.supported || selectedContent.length === 0} onClick={() => setStage('conflicts')}>Continuar <ArrowRight size={17} /></button> : null}
          {stage === 'conflicts' ? <button type="button" className="import-button-primary" onClick={() => setStage('confirm')}>Revisar importación <ArrowRight size={17} /></button> : null}
          {stage === 'confirm' ? <button type="button" className="import-button-primary" onClick={() => void runImport()}><Upload size={17} /> Importar ahora</button> : null}
          {stage === 'result' ? <button type="button" className="import-button-primary" onClick={() => onImported(outcome!)}>Abrir proyecto <ArrowRight size={17} /></button> : null}
        </footer>
      </div>
    </div>
  );
};
