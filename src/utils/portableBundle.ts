import type { AnalysisResult, ProjectModel } from '../types';
import { createCalculationReport, type CalculationReportOptions } from './calculationPdf';
import { canonicalStringify, parsePortablePayload, serializePortablePayload } from './portablePayload';
import {
  PORTABLE_FORMAT_VERSION,
  type PortableBundleManifest,
  type StructureCoPortablePayload,
} from './portableTypes';

export interface PortableBundleArtifact {
  bytes: Uint8Array;
  filename: string;
  manifest: PortableBundleManifest;
  payload: StructureCoPortablePayload;
  reportBytes: Uint8Array;
}

export interface PortableBundleContents {
  manifest: PortableBundleManifest;
  payload: StructureCoPortablePayload;
  reportBytes: Uint8Array;
}

const safeFilename = (name: string): string => name
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9 _-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .toLowerCase() || 'structureco-project';

const decodeJson = (bytes: Uint8Array, label: string): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error(`${label} no contiene JSON valido.`);
  }
};

const assertManifest: (value: unknown) => asserts value is PortableBundleManifest = (value) => {
  if (typeof value !== 'object' || value === null
    || !('format' in value) || value.format !== 'structureco-bundle'
    || !('formatVersion' in value) || value.formatVersion !== PORTABLE_FORMAT_VERSION
    || !('payloadChecksum' in value) || typeof value.payloadChecksum !== 'string') {
    throw new Error('El paquete no tiene un manifest structureCo compatible.');
  }
};

export const createPortableBundle = async (
  project: ProjectModel,
  analysis: AnalysisResult,
  options: CalculationReportOptions = {},
): Promise<PortableBundleArtifact> => {
  const [{ zipSync, strToU8 }, report] = await Promise.all([
    import('fflate'),
    createCalculationReport(project, analysis, options),
  ]);
  const manifest: PortableBundleManifest = {
    format: 'structureco-bundle',
    formatVersion: PORTABLE_FORMAT_VERSION,
    createdAt: report.payload.provenance.generatedAt,
    appVersion: report.payload.provenance.appVersion,
    projectName: project.name,
    payloadChecksum: report.payload.checksum.value,
    files: {
      payload: 'portable/payload.json',
      project: 'project.json',
      analysis: 'analysis/result.json',
      report: 'report/calculation-report.pdf',
    },
  };
  const bytes = zipSync({
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    [manifest.files.payload]: strToU8(serializePortablePayload(report.payload, true)),
    [manifest.files.project]: strToU8(JSON.stringify(project, null, 2)),
    [manifest.files.analysis]: strToU8(JSON.stringify(analysis, null, 2)),
    [manifest.files.report]: report.bytes,
  }, { level: 6 });
  return {
    bytes,
    filename: `${safeFilename(project.name)}.structureco`,
    manifest,
    payload: report.payload,
    reportBytes: report.bytes,
  };
};

export const readPortableBundle = async (
  input: ArrayBuffer | Uint8Array | Blob,
): Promise<PortableBundleContents> => {
  const source = input instanceof Blob
    ? new Uint8Array(await input.arrayBuffer())
    : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  const { unzipSync } = await import('fflate');
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(source);
  } catch {
    throw new Error('El archivo .structureco no es un paquete ZIP valido.');
  }
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) throw new Error('El paquete no contiene manifest.json.');
  const manifestValue = decodeJson(manifestBytes, 'manifest.json');
  assertManifest(manifestValue);
  const manifest = manifestValue;
  const payloadBytes = files[manifest.files.payload];
  const projectBytes = files[manifest.files.project];
  const analysisBytes = files[manifest.files.analysis];
  const reportBytes = files[manifest.files.report];
  if (!payloadBytes || !projectBytes || !analysisBytes || !reportBytes) {
    throw new Error('El paquete structureCo esta incompleto.');
  }
  const payload = await parsePortablePayload(payloadBytes);
  if (payload.checksum.value !== manifest.payloadChecksum) throw new Error('El checksum del manifest no coincide con el expediente.');
  const project = decodeJson(projectBytes, 'project.json');
  const analysis = decodeJson(analysisBytes, 'analysis/result.json');
  if (canonicalStringify(project) !== canonicalStringify(payload.project)
    || canonicalStringify(analysis) !== canonicalStringify(payload.analysis)) {
    throw new Error('Los datos separados del paquete no coinciden con el expediente firmado.');
  }
  return { manifest, payload, reportBytes };
};
