import type { AnalysisResult, ProjectModel } from '../types';
import { normalizeProject } from '../data/migrate';
import { inspectPdf, type InspectPdfOptions } from './pdfImport';
import { parsePortablePayload } from './portablePayload';
import { readPortableBundle, type PortableBundleContents } from './portableBundle';
import type { PdfInspection, StructureCoPortablePayload } from './portableTypes';

interface PortableFileBase {
  fileName: string;
  size: number;
}

export type PortableFileInspection =
  | (PortableFileBase & { kind: 'native-pdf'; canRestoreProject: true; pdf: PdfInspection; payload: StructureCoPortablePayload })
  | (PortableFileBase & { kind: 'external-pdf' | 'scanned-pdf'; canRestoreProject: false; pdf: PdfInspection })
  | (PortableFileBase & { kind: 'bundle'; canRestoreProject: true; bundle: PortableBundleContents; payload: StructureCoPortablePayload })
  | (PortableFileBase & { kind: 'payload-json'; canRestoreProject: true; payload: StructureCoPortablePayload })
  | (PortableFileBase & { kind: 'project-json'; canRestoreProject: true; project: ProjectModel });

export type PortableImportResult =
  | {
      kind: 'project';
      source: 'native-pdf' | 'bundle' | 'payload-json' | 'project-json';
      project: ProjectModel;
      analysis?: AnalysisResult;
      payload?: StructureCoPortablePayload;
    }
  | {
      kind: 'reference';
      source: 'external-pdf' | 'scanned-pdf';
      file: File;
      preview: PdfInspection;
    };

const startsWith = (bytes: Uint8Array, signature: number[]): boolean =>
  signature.every((byte, index) => bytes[index] === byte);

const inspectJson = async (bytes: Uint8Array, base: PortableFileBase): Promise<PortableFileInspection> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error('El archivo JSON no es valido.');
  }
  if (typeof parsed === 'object' && parsed !== null && 'format' in parsed && parsed.format === 'structureco-portable') {
    const payload = await parsePortablePayload(bytes);
    return { ...base, kind: 'payload-json', canRestoreProject: true, payload };
  }
  return { ...base, kind: 'project-json', canRestoreProject: true, project: normalizeProject(parsed) };
};

/** Single adapter for the import center: PDF, .structureco ZIP, or JSON. */
export const inspectPortableFile = async (
  file: File,
  options?: InspectPdfOptions,
): Promise<PortableFileInspection> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base: PortableFileBase = { fileName: file.name, size: file.size };
  const lowerName = file.name.toLowerCase();
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) || file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const pdf = await inspectPdf(bytes, options);
    if (pdf.kind === 'native' && pdf.payload) {
      return { ...base, kind: 'native-pdf', canRestoreProject: true, pdf, payload: pdf.payload };
    }
    return { ...base, kind: pdf.kind === 'scanned' ? 'scanned-pdf' : 'external-pdf', canRestoreProject: false, pdf };
  }
  if (startsWith(bytes, [0x50, 0x4B]) || lowerName.endsWith('.structureco')) {
    const bundle = await readPortableBundle(bytes);
    return { ...base, kind: 'bundle', canRestoreProject: true, bundle, payload: bundle.payload };
  }
  if (lowerName.endsWith('.json') || file.type.includes('json') || startsWith(bytes, [0x7B])) {
    return inspectJson(bytes, base);
  }
  throw new Error('Formato no compatible. Usa PDF, .structureco o .structureco.json.');
};

/** External/scanned PDFs remain references; no model is inferred or silently trusted. */
export const importPortableFile = async (
  file: File,
  options?: InspectPdfOptions,
): Promise<PortableImportResult> => {
  const inspection = await inspectPortableFile(file, options);
  if (!inspection.canRestoreProject) {
    return { kind: 'reference', source: inspection.kind, file, preview: inspection.pdf };
  }
  if (inspection.kind === 'project-json') {
    return { kind: 'project', source: inspection.kind, project: inspection.project };
  }
  if ('payload' in inspection) return {
    kind: 'project',
    source: inspection.kind,
    project: inspection.payload.project,
    analysis: inspection.payload.analysis,
    payload: inspection.payload,
  };
  throw new Error('El archivo no contiene un proyecto recuperable.');
};
