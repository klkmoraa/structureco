import type { CalculationReportArtifact, CalculationReportOptions } from './pdf/reportContext';

export type PdfRenderEngine = 'browser' | 'reportlab';

export type EnhancedCalculationReport = CalculationReportArtifact & {
  renderEngine: PdfRenderEngine;
};

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8765';
const ENDPOINT_STORAGE_KEY = 'structureco:reportlab-endpoint:v1';

const endpoint = (): string => {
  if (typeof window === 'undefined') return DEFAULT_ENDPOINT;
  try {
    return window.localStorage.getItem(ENDPOINT_STORAGE_KEY)?.replace(/\/$/, '') || DEFAULT_ENDPOINT;
  } catch {
    return DEFAULT_ENDPOINT;
  }
};

const withTimeout = async (input: RequestInfo | URL, init: RequestInit, milliseconds: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

/**
 * Adds ReportLab's vector diagram appendix when the optional local companion is running.
 *
 * StructureCo is a static browser application, so Python cannot execute inside its runtime.
 * The local companion is deliberately optional: it receives the already calculated PDF and
 * payload, adds pages, and never becomes an alternative solver. A published/offline copy keeps
 * the complete browser report when the companion is absent.
 */
export const enhanceCalculationReportWithReportLab = async (
  artifact: CalculationReportArtifact,
  options: CalculationReportOptions = {},
): Promise<EnhancedCalculationReport> => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return { ...artifact, renderEngine: 'browser' };
  const base = endpoint();
  try {
    const health = await withTimeout(`${base}/health`, { method: 'GET', cache: 'no-store' }, 450);
    if (!health.ok) return { ...artifact, renderEngine: 'browser' };
    const response = await withTimeout(`${base}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        pdfBase64: bytesToBase64(artifact.bytes),
        payload: artifact.payload,
        scenarioFactors: options.scenarioFactors,
      }),
    }, 45_000);
    if (!response.ok) return { ...artifact, renderEngine: 'browser' };
    return { ...artifact, bytes: new Uint8Array(await response.arrayBuffer()), renderEngine: 'reportlab' };
  } catch {
    return { ...artifact, renderEngine: 'browser' };
  }
};
