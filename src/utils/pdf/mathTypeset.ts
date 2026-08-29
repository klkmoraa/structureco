/**
 * Vector TeX was previously produced with MathJax's Node-oriented lite adaptor.
 * That adaptor reaches for CommonJS `require`, which makes a browser-side PDF
 * export fail before it can create a document. A report must always export;
 * the browser renderer therefore uses the built-in PDF fonts for equations.
 *
 * The types below remain the narrow contract consumed by `mathVector.ts`.
 * `pdfMath.ts` checks `isVectorMathAvailable` and intentionally takes its
 * plain-text fallback without logging a warning for every equation.
 */
export class MathTypesetError extends Error {}

export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export type FormulaOp =
  | { kind: 'path'; path: string; matrix: AffineMatrix }
  | { kind: 'rect'; matrix: AffineMatrix; x: number; y: number; width: number; height: number };

export interface ParsedFormula {
  ops: FormulaOp[];
  widthUnits: number;
  heightUnits: number;
  depthUnits: number;
}

/** Browser-safe exports deliberately prefer readable native PDF text to failure. */
export const isVectorMathAvailable = false;

export const typesetLatex = (_latex: string, _display = false): ParsedFormula => {
  throw new MathTypesetError('El tipografiado vectorial no está disponible en la exportación web.');
};
