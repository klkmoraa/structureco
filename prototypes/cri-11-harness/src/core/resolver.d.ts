/**
 * Tipos del resolutor. El módulo se mantiene en JavaScript plano para que
 * `node --test` lo ejecute sin toolchain (igual que el modelo de CRI-9); esta
 * declaración le da tipos al lado TypeScript sin duplicar la lógica.
 */

export type CompositionId = 'X2' | 'M1' | 'K0';
export type RailMode = 'dock' | 'band';
export type DetailMode = 'dock' | 'overlay-inset' | 'sheet';
export type DenseMode = 'drawer' | 'fullscreen';
export type SheetSide = 'bottom' | 'side';

export interface Viewport {
  width: number;
  height: number;
}

export interface Box {
  width: number;
  height: number;
  area: number;
}

export interface Bands {
  top: number;
  bottom: number;
  extra: number;
}

export interface Verdict {
  composition: CompositionId;
  name: string;
  restShare: number;
  detailShare: number;
  cb1: boolean;
  cb2: boolean;
  cb4: boolean;
  cb6: boolean;
  passes: boolean;
  restBox: Box;
  detailBox: Box;
  sheetSide: SheetSide | null;
  railMode: RailMode;
  railWidth: number;
  detailMode: DetailMode;
  detailWidth: number | null;
  denseMode: DenseMode;
  bands: Bands;
  heldByHysteresis?: boolean;
}

export interface SafeRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface ViewportPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export declare const CHROME: Record<string, number>;
export declare const CB: {
  coexistenceFloor: number;
  restFloor: number;
  floatingChromeMax: number;
  compactDefaultDetentFloor: number;
};
export declare const COMPOSITIONS: Record<CompositionId, unknown>;
export declare const VIEWPORT_PRESETS: ViewportPreset[];

export declare function compactSheetSide(viewport: Viewport): SheetSide;
export declare function resolveComposition(viewport: Viewport, options?: { resultsHeight?: number }): Verdict;
export declare function resolveWithHysteresis(
  viewport: Viewport,
  previous?: CompositionId | null,
  options?: { bandPx?: number; resultsHeight?: number },
): Verdict;
export declare function safeRect(
  verdict: Verdict,
  viewport: Viewport,
  options?: {
    detailPresent?: boolean;
    floatingInsets?: { top?: number; right?: number; bottom?: number; left?: number };
  },
): SafeRect;
export declare function denseDockAffordable(viewport: Viewport): boolean;
export declare function expandedBoundary(height: number): number | null;
export declare function calibrate(): { label: string; canvasPct: number; modelled: number; delta: number }[];
