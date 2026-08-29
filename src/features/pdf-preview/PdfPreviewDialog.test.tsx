// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { PdfPreviewDialog } from './PdfPreviewDialog';

const pdfMocks = vi.hoisted(() => ({ getDocument: vi.fn(), render: vi.fn(() => ({ promise: Promise.resolve() })), getPage: vi.fn() }));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: pdfMocks.getDocument,
}));
vi.mock('pdfjs-dist/legacy/build/pdf.worker.mjs?url', () => ({ default: 'pdf-worker.js' }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('PdfPreviewDialog', () => {
  it('renders supplied PDF bytes, changes pages, and downloads only after an explicit request', async () => {
    const user = userEvent.setup();
    const cleanupPage = vi.fn();
    pdfMocks.getPage.mockResolvedValue({ getViewport: () => ({ width: 612, height: 792 }), render: pdfMocks.render, cleanup: cleanupPage });
    pdfMocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage: pdfMocks.getPage, cleanup: vi.fn(), destroy: vi.fn() }) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    const onClose = vi.fn();
    const onDownload = vi.fn();

    render(<ProjectProvider><PdfPreviewDialog artifact={{ bytes: new Uint8Array([37, 80, 68, 70]), filename: 'memoria.pdf' }} onClose={onClose} onDownload={onDownload} /></ProjectProvider>);

    expect(await screen.findByRole('dialog', { name: 'Vista previa de la memoria PDF' })).toBeTruthy();
    expect(await screen.findByLabelText('Documento PDF: memoria.pdf')).toBeTruthy();
    expect(screen.getByText('Página 1 de 2')).toBeTruthy();
    expect(pdfMocks.getDocument).toHaveBeenCalledOnce();
    expect(pdfMocks.getPage).toHaveBeenCalledWith(1);
    expect(onDownload).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(pdfMocks.getPage).toHaveBeenCalledWith(2));
    expect(screen.getByText('Página 2 de 2')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(onDownload).toHaveBeenCalledOnce();
    await user.click(screen.getAllByRole('button', { name: 'Cerrar vista previa' })[0]!);
    expect(onClose).toHaveBeenCalledOnce();
    expect(cleanupPage).toHaveBeenCalled();
  });

  it('recompone el documento al cambiar una sección y conserva el documento técnico único', async () => {
    const user = userEvent.setup();
    pdfMocks.getPage.mockResolvedValue({ getViewport: () => ({ width: 612, height: 792 }), render: pdfMocks.render, cleanup: vi.fn() });
    pdfMocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: pdfMocks.getPage, cleanup: vi.fn(), destroy: vi.fn() }) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    const onRebuild = vi.fn().mockResolvedValue({ bytes: new Uint8Array([37, 80, 68, 70, 45]), filename: 'recompuesta.pdf', renderEngine: 'browser' as const });

    render(<ProjectProvider><PdfPreviewDialog artifact={{ bytes: new Uint8Array([37, 80, 68, 70]), filename: 'memoria.pdf' }} onClose={vi.fn()} onDownload={vi.fn()} onRebuild={onRebuild} /></ProjectProvider>);

    await user.click(await screen.findByRole('checkbox', { name: 'DCL de cada paso del método' }));
    await waitFor(() => expect(onRebuild).toHaveBeenCalledWith(expect.objectContaining({ includeMethodFreeBodies: false })), { timeout: 2_000 });
    expect(await screen.findByText('Generador web')).toBeTruthy();
  });
});
