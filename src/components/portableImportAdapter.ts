import type { ProjectModel } from '../types';
import { normalizeProject } from '../data/migrate';
import {
  inspectPortableFile,
  type PortableFileInspection,
} from '../utils/portableFile';
import type {
  ImportCenterAdapter,
  ImportContentOption,
  ImportInspection,
  ImportOutcome,
} from './ImportCenterDialog';

const inspectedFiles = new WeakMap<File, PortableFileInspection>();

const projectContents = (
  project: ProjectModel,
  includeAnalysis: boolean,
): ImportContentOption[] => [
  {
    key: 'geometry',
    label: 'Geometría y propiedades',
    detail: `${project.nodes.length} nodos · ${project.members.length} miembros`,
    available: true,
    selectedByDefault: true,
  },
  {
    key: 'supports',
    label: 'Apoyos y desplazamientos',
    detail: `${project.nodes.filter((node) => node.support.type !== 'none').length} apoyos`,
    available: true,
    selectedByDefault: true,
  },
  {
    key: 'loads',
    label: 'Cargas, casos y combinaciones',
    detail: `${project.nodalLoads.length + project.memberLoads.length} cargas`,
    available: true,
    selectedByDefault: true,
  },
  {
    key: 'results',
    label: 'Resultados del análisis',
    detail: includeAnalysis ? 'Reacciones, desplazamientos y verificación numérica' : 'Se recalculan después de importar',
    available: includeAnalysis,
    selectedByDefault: includeAnalysis,
  },
  {
    key: 'diagrams',
    label: 'DCL y diagramas N–V–M',
    detail: includeAnalysis ? 'Segmentos exactos, saltos y puntos críticos' : 'Se generan al analizar',
    available: includeAnalysis,
    selectedByDefault: includeAnalysis,
  },
  {
    key: 'procedures',
    label: 'Procedimientos y cálculos',
    detail: includeAnalysis ? 'Pasos, ecuaciones, matrices y traza educativa' : 'Se generan al analizar',
    available: includeAnalysis,
    selectedByDefault: includeAnalysis,
  },
  {
    key: 'attachments',
    label: 'Procedencia e integridad',
    detail: includeAnalysis ? 'Metadatos y checksum SHA-256 verificados' : 'Sin adjuntos',
    available: includeAnalysis,
    selectedByDefault: includeAnalysis,
  },
];

const referenceContents = (inspection: PortableFileInspection): ImportContentOption[] => {
  const pages = 'pdf' in inspection ? inspection.pdf.pageCount : 0;
  return [
    { key: 'geometry', label: 'Geometría y propiedades', detail: 'No se reconstruyen sin confirmación humana', available: false },
    { key: 'supports', label: 'Apoyos y desplazamientos', detail: 'No confirmados', available: false },
    { key: 'loads', label: 'Cargas, casos y combinaciones', detail: 'No confirmados', available: false },
    { key: 'results', label: 'Resultados detectados', detail: 'Se conservan solo como referencia', available: false },
    { key: 'diagrams', label: 'DCL y diagramas', detail: 'No se convierten en resultados calculados', available: false },
    { key: 'procedures', label: 'Texto y procedimientos', detail: `${pages} páginas inspeccionadas`, available: false },
    { key: 'attachments', label: 'PDF original', detail: 'No se guarda en localStorage para proteger la memoria de iOS', available: false },
  ];
};

const mapInspection = (inspection: PortableFileInspection): ImportInspection => {
  const isPdf = inspection.kind.endsWith('-pdf');
  const kind: ImportInspection['kind'] = isPdf
    ? 'pdf'
    : inspection.kind === 'bundle'
      ? 'structureco'
      : 'json';

  if (!inspection.canRestoreProject) {
    return {
      kind,
      sourceLabel: inspection.kind === 'scanned-pdf' ? 'PDF escaneado' : 'PDF externo',
      confidence: Math.round(inspection.pdf.confidence * 100),
      supported: false,
      summary: inspection.pdf.text
        ? `Se extrajo texto de ${inspection.pdf.pageCount} páginas. Puede revisarse como referencia, pero no se inventará un modelo estructural.`
        : 'El PDF parece escaneado. Se necesita OCR y revisión manual antes de crear un modelo.',
      statistics: [
        { label: 'Páginas', value: inspection.pdf.pageCount },
        { label: 'Caracteres', value: inspection.pdf.text.length },
        { label: 'Tamaño', value: `${(inspection.size / 1024 / 1024).toFixed(2)} MB` },
      ],
      warnings: inspection.pdf.warnings,
      contents: referenceContents(inspection),
    };
  }

  const payload = 'payload' in inspection ? inspection.payload : undefined;
  const project = normalizeProject(inspection.kind === 'project-json' ? inspection.project : payload!.project);
  const includeAnalysis = Boolean(payload?.analysis);
  const sourceLabel = inspection.kind === 'native-pdf'
    ? 'PDF inteligente de structureCo'
    : inspection.kind === 'bundle'
      ? 'Expediente portátil .structureco'
      : inspection.kind === 'payload-json'
        ? 'Snapshot portátil JSON'
        : 'Proyecto structureCo JSON';
  const warnings = inspection.kind === 'native-pdf'
    ? inspection.pdf.warnings
    : project.nodes.length === 0
      ? ['El proyecto no contiene nodos.']
      : [];

  return {
    kind,
    sourceLabel,
    version: payload?.provenance.appVersion ?? String(project.schemaVersion),
    confidence: payload ? 99 : 100,
    supported: true,
    summary: payload
      ? `Expediente “${project.name}” verificado con SHA-256; el modelo, resultados, diagramas y procedimientos pueden restaurarse.`
      : `Proyecto “${project.name}” validado; los resultados se recalcularán al abrirlo.`,
    statistics: [
      { label: 'Nodos', value: project.nodes.length },
      { label: 'Miembros', value: project.members.length },
      { label: 'Cargas', value: project.nodalLoads.length + project.memberLoads.length },
      { label: 'Procedimientos', value: payload?.analysis.explanation.length ?? 0 },
    ],
    warnings,
    contents: projectContents(project, includeAnalysis),
    project,
    restoredAnalysis: payload?.analysis,
  };
};

export const portableImportCenterAdapter: ImportCenterAdapter = {
  inspect: async (file) => {
    const inspection = await inspectPortableFile(file, { maxBytes: 25 * 1024 * 1024, maxPages: 120 });
    inspectedFiles.set(file, inspection);
    return mapInspection(inspection);
  },
  importFile: async (file, inspection): Promise<ImportOutcome> => {
    const portable = inspectedFiles.get(file) ?? await inspectPortableFile(file, { maxBytes: 25 * 1024 * 1024, maxPages: 120 });
    if (!portable.canRestoreProject) {
      throw new Error('Este PDF se inspeccionó como referencia. Confirma primero su geometría y cargas antes de convertirlo en un modelo.');
    }
    const payload = 'payload' in portable ? portable.payload : undefined;
    const project = normalizeProject(portable.kind === 'project-json' ? portable.project : payload!.project);
    return {
      project,
      restoredAnalysis: payload?.analysis,
      title: payload ? 'Expediente completo restaurado' : 'Proyecto importado',
      message: payload
        ? 'Se verificaron el modelo, resultados, diagramas, procedimientos y checksum del expediente.'
        : 'El modelo quedó listo; ejecuta Analizar para generar resultados y procedimientos.',
      statistics: inspection.statistics,
      warnings: inspection.warnings,
    };
  },
};
