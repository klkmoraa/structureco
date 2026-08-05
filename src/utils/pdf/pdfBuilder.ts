/**
 * Vertical-flow layout engine for the calculation report.
 *
 * `PdfLayout` owns the only mutable state of the document: the current page and the vertical
 * cursor. Sections declare *what* to write (`heading`, `text`, `row`) and the layout decides
 * where it lands, breaking the page when the block no longer fits. Absolute-positioned
 * artwork still draws through `layout.page`, which must always be read at the moment of use —
 * a page break replaces it.
 */
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { wrapText } from './pdfGlyphs';
import type { PdfColor, ReportFonts, ReportPalette, RgbFactory } from './reportContext';

export const PAGE_SIZE: [number, number] = [595.28, 841.89];
export const MARGIN = 48;
export const CONTENT_BOTTOM = 52;

export type HeadingLevel = 1 | 2;

export class PdfLayout {
  readonly doc: PDFDocument;
  readonly fonts: ReportFonts;
  readonly palette: ReportPalette;
  readonly rgb: RgbFactory;
  readonly pages: PDFPage[] = [];
  readonly width = PAGE_SIZE[0];
  readonly height = PAGE_SIZE[1];
  readonly margin = MARGIN;
  /** Usable width between margins. */
  readonly contentWidth = PAGE_SIZE[0] - MARGIN * 2;
  /** Current page. Never cache this across a call that may break the page. */
  page!: PDFPage;
  /** Vertical cursor, in PDF units from the bottom of the page. */
  y = 0;

  constructor(doc: PDFDocument, fonts: ReportFonts, palette: ReportPalette, rgb: RgbFactory) {
    this.doc = doc;
    this.fonts = fonts;
    this.palette = palette;
    this.rgb = rgb;
    this.newPage();
  }

  newPage(): void {
    this.page = this.doc.addPage(PAGE_SIZE);
    this.pages.push(this.page);
    this.y = this.height - MARGIN;
  }

  /** Break the page when `height` no longer fits above the footer. */
  ensure(height: number): void {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  rule(): void {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: this.width - MARGIN, y: this.y },
      thickness: 0.7,
      color: this.palette.rule,
    });
    this.y -= 10;
  }

  text(content: string, size = 9, font: PDFFont = this.fonts.regular, color: PdfColor = this.palette.ink, indent = 0): void {
    const lines = wrapText(content, font, size, this.contentWidth - indent);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      this.ensure(lineHeight);
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color });
      this.y -= lineHeight;
    }
  }

  heading(content: string, level: HeadingLevel = 1): void {
    const size = level === 1 ? 16 : 11.5;
    this.ensure(size * 2.1);
    this.y -= level === 1 ? 8 : 4;
    this.text(content, size, this.fonts.bold, level === 1 ? this.palette.forest : this.palette.forestDeep);
    if (level === 1) this.rule();
  }

  /** `label: value` entry of the technical annex. */
  row(label: string, value: string): void {
    this.ensure(15);
    this.text(`${label}: ${value}`, 8.7, this.fonts.regular, this.rgb(0.15, 0.18, 0.22), 8);
  }

  /** Running footer with the page count, stamped once every page exists. */
  stampFooters(): void {
    for (const [index, reportPage] of this.pages.entries()) {
      reportPage.drawLine({
        start: { x: MARGIN, y: 36 },
        end: { x: this.width - MARGIN, y: 36 },
        thickness: 0.5,
        color: this.rgb(0.78, 0.81, 0.85),
      });
      reportPage.drawText(`structureCo - memoria de calculo | pagina ${index + 1} de ${this.pages.length}`, {
        x: MARGIN,
        y: 20,
        size: 7.5,
        font: this.fonts.regular,
        color: this.rgb(0.36, 0.40, 0.45),
      });
    }
  }
}
