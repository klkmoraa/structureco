import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { Dialog } from '../../design-system/components/overlays';
import { Button } from '../../design-system/components/controls';
import { useI18n } from '../../i18n/useI18n';
import {
  DEFAULT_SOLUTION_METHOD,
  SOLUTION_METHODS,
  type SolutionMethodId,
} from '../../analysis-methods/methodRegistry';
import {
  CALCULATION_PDF_EXPORT_DEFAULTS,
  type CalculationReportOptions,
} from '../../utils/pdf/reportContext';
import type { TranslationKey } from '../../i18n/catalogs';
import './pdfPreviewDialog.css';

export interface PdfPreviewArtifact {
  bytes: Uint8Array;
  filename: string;
  renderEngine?: 'browser' | 'reportlab';
  solutionMethod?: SolutionMethodId;
  methodAvailability?: Record<SolutionMethodId, { available: boolean; reasonKey?: string }>;
}

interface PdfPreviewDialogProps {
  artifact: PdfPreviewArtifact;
  onClose: () => void;
  onDownload: (artifact: PdfPreviewArtifact) => void | Promise<void>;
  onRebuild?: (options: CalculationReportOptions) => Promise<PdfPreviewArtifact>;
}

const PREVIEW_SECTIONS = [
  'includeDiagrams',
  'includeScope',
  'includeProcedure',
  'includeMethodFreeBodies',
  'includeMaterials',
  'includeAnnex',
  'includeEducationTrace',
] as const;
type PreviewSection = (typeof PREVIEW_SECTIONS)[number];
type PreviewSelection = Record<PreviewSection, boolean>;
const DEFAULT_SELECTION: PreviewSelection = Object.fromEntries(
  PREVIEW_SECTIONS.map((key) => [key, CALCULATION_PDF_EXPORT_DEFAULTS[key] !== false]),
) as PreviewSelection;
const HOSTED_BY: Partial<Record<PreviewSection, PreviewSection>> = {
  includeMethodFreeBodies: 'includeProcedure',
  includeEducationTrace: 'includeAnnex',
};

type PdfPreviewPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; transform?: number[] }) => { promise: Promise<unknown>; cancel?: () => void };
  cleanup: () => void;
};
type PdfPreviewDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPreviewPage>;
  cleanup: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
};

/** PDF.js only loads inside this lazy dialog and renders the exact bytes to download. */
export const PdfPreviewDialog = ({ artifact, onClose, onDownload, onRebuild }: PdfPreviewDialogProps) => {
  const { t } = useI18n();
  const [currentArtifact, setCurrentArtifact] = useState(artifact);
  const [selection, setSelection] = useState<PreviewSelection>(DEFAULT_SELECTION);
  const [solutionMethod, setSolutionMethod] = useState<SolutionMethodId>(artifact.solutionMethod ?? DEFAULT_SOLUTION_METHOD);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildFailed, setRebuildFailed] = useState(false);
  const [documentProxy, setDocumentProxy] = useState<PdfPreviewDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionKey = JSON.stringify({ selection, solutionMethod });
  const lastSelection = useRef(selectionKey);

  useEffect(() => { setCurrentArtifact(artifact); }, [artifact]);

  useEffect(() => {
    if (!onRebuild || selectionKey === lastSelection.current) return undefined;
    const timer = window.setTimeout(() => {
      lastSelection.current = selectionKey;
      setRebuilding(true);
      setRebuildFailed(false);
      void onRebuild({ ...selection, solutionMethod }).then(setCurrentArtifact).catch(() => setRebuildFailed(true)).finally(() => setRebuilding(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [onRebuild, selection, selectionKey, solutionMethod]);

  useEffect(() => {
    let cancelled = false;
    let preview: PdfPreviewDocument | null = null;
    const load = async () => {
      setStatus('loading');
      setDocumentProxy(null);
      setPageNumber(1);
      try {
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        if (typeof document !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
          const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        }
        const source = new Uint8Array(currentArtifact.bytes.byteLength);
        source.set(currentArtifact.bytes);
        preview = await pdfjs.getDocument({ data: source, useWorkerFetch: false }).promise as unknown as PdfPreviewDocument;
        if (cancelled) {
          await preview.destroy?.();
          return;
        }
        setDocumentProxy(preview);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    };
    void load();
    return () => {
      cancelled = true;
      void preview?.destroy?.();
    };
  }, [currentArtifact.bytes]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current) return undefined;
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel?: () => void } | null = null;
    const render = async () => {
      try {
        const page = await documentProxy.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.35 });
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width * density);
        canvas.height = Math.ceil(viewport.height * density);
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas-unavailable');
        renderTask = page.render({ canvasContext: context, viewport, transform: density === 1 ? undefined : [density, 0, 0, density, 0, 0] });
        await renderTask.promise;
        page.cleanup();
      } catch {
        if (!cancelled) setStatus('failed');
      }
    };
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [documentProxy, pageNumber]);

  const pageCount = documentProxy?.numPages ?? 0;
  return <Dialog
    open
    onOpenChange={(open) => { if (!open) onClose(); }}
    title={t('portable.previewTitle')}
    description={t('portable.previewDescription')}
    closeLabel={t('portable.previewClose')}
    className="pdf-preview-dialog"
    footer={<><Button variant="secondary" onClick={onClose}>{t('portable.previewClose')}</Button><Button variant="primary" disabled={rebuilding} onClick={() => void onDownload(currentArtifact)} leadingIcon={<Download size={16} />}>{t('portable.previewDownload')}</Button></>}
  >
    <div className="pdf-preview-dialog__meta"><FileText size={18} aria-hidden="true" /><span>{currentArtifact.filename}</span><span className="pdf-preview-dialog__engine">{t(currentArtifact.renderEngine === 'reportlab' ? 'portable.previewEngineReportLab' : 'portable.previewEngineBrowser')}</span>{pageCount > 0 ? <span>{t('portable.previewPage', { page: pageNumber, total: pageCount })}</span> : null}</div>
    <div className="pdf-preview-dialog__workspace">
      <aside className="pdf-preview-dialog__options" aria-label={t('portable.previewContentTitle')}>
        <fieldset className="pdf-preview-dialog__methods">
          <legend>{t('method.exportTitle', { count: SOLUTION_METHODS.length })}</legend>
          {SOLUTION_METHODS.map((method) => {
            const methodState = currentArtifact.methodAvailability?.[method.id];
            const available = methodState?.available ?? method.id === DEFAULT_SOLUTION_METHOD;
            return <label key={method.id}>
              <input
                type="radio"
                name="pdf-solution-method"
                value={method.id}
                checked={solutionMethod === method.id}
                disabled={rebuilding || !available}
                onChange={() => setSolutionMethod(method.id)}
              />
              <span>{t(method.labelKey as TranslationKey)}</span>
              <small>{t((available ? 'method.appliesNow' : methodState?.reasonKey ?? 'method.unavailableForModel') as TranslationKey)}</small>
            </label>;
          })}
        </fieldset>
        <strong>{t('portable.previewContentTitle')}</strong>
        {PREVIEW_SECTIONS.map((section) => <label key={section}><input type="checkbox" checked={selection[section]} disabled={rebuilding || Boolean(HOSTED_BY[section] && !selection[HOSTED_BY[section]!] )} onChange={() => setSelection((current) => ({ ...current, [section]: !current[section] }))} /><span>{t(`portable.preview.${section}`)}</span></label>)}
        <small>{t('portable.previewContentNote')}</small>
      </aside>
      <div className="pdf-preview-dialog__viewer">
        {rebuilding ? <div className="pdf-preview-dialog__status" role="status">{t('portable.previewRebuilding')}</div> : null}
        {rebuildFailed ? <div className="pdf-preview-dialog__status is-error" role="alert">{t('portable.previewRebuildFailed')}</div> : null}
        {status === 'loading' ? <div className="pdf-preview-dialog__unavailable" role="status">{t('portable.previewLoading')}</div> : null}
        {status === 'ready' ? <div className="pdf-preview-dialog__page"><canvas ref={canvasRef} aria-label={t('portable.previewDocument', { filename: currentArtifact.filename })} />{pageCount > 1 ? <nav aria-label={t('portable.previewPagination')}><Button variant="secondary" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} disabled={pageNumber === 1} leadingIcon={<ChevronLeft size={16} />}>{t('portable.previewPrevious')}</Button><Button variant="secondary" onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))} disabled={pageNumber === pageCount} trailingIcon={<ChevronRight size={16} />}>{t('portable.previewNext')}</Button></nav> : null}</div> : null}
        {status === 'failed' ? <div className="pdf-preview-dialog__unavailable" role="alert">{t('portable.previewUnavailable')}</div> : null}
      </div>
    </div>
  </Dialog>;
};
