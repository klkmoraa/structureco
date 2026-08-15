/**
 * CRI-11 Fase A · Resolutor de composición (capa 4 de la Alternativa D de CRI-9).
 *
 * QUÉ ES: la función pura que responde «¿qué cabe?». Dado un viewport, calcula
 * la composición más rica que todavía respeta las reglas de canvas-budget
 * CB-1..CB-6. No lee el DOM, no toca React y no decide nada sobre foco,
 * borradores ni transiciones — eso es del broker (capa 5).
 *
 * DE DÓNDE SALE: es un port fiel de
 * `reports/evidence/2026-08-15-cri-9-adaptive-architecture/canvas-budget-model.mjs`,
 * el modelo que CRI-9 calibró contra las mediciones reales de CRI-7 con un
 * error máximo de 0.24 puntos porcentuales. Las constantes NO se eligieron
 * aquí: se despejan de porcentajes publicados, y cada una conserva su cálculo.
 * `resolver.test.mjs` vuelve a comprobar las once mediciones de CRI-7 y las
 * predicciones publicadas por CRI-9 §12; si el port se desviara, falla.
 *
 * QUÉ AÑADE EL PORT (y CRI-9 no tenía):
 *   · `resolveWithHysteresis` — T-INV-5. El umbral concreto es U-13, un
 *     unknown que CRI-9 dejó explícitamente para medir en CRI-11; aquí es un
 *     parámetro observable, no una opinión escrita a fuego.
 *   · `safeRect` — el rectángulo seguro que se reduce bajo un `inset` o una
 *     `sheet` sin mover la cámara (D-01).
 *
 * Se mantiene en JavaScript plano a propósito: así `node --test` lo ejecuta sin
 * toolchain, igual que hace CRI-9 con su modelo.
 */

// ---------------------------------------------------------------------------
// 1. Constantes de chrome, despejadas de las mediciones de CRI-7 §2
// ---------------------------------------------------------------------------

export const CHROME = {
  // 8.9% de 1024×768 = 69 985 px² / 1024 = 68.3 px · 7.6% de 1440×900 → 68.4 px
  topBarWide: 68,
  // 5.7% de 390×844 = 18 762 px² / 390 = 48.1 px
  topBarCompact: 48,
  // 2.9% de 1024×768 = 22 806 px² / 1024 = 22.3 px
  footerWide: 22,
  // Despejado de 768×1024 y 900×1000: ambos exigen 16 px más de chrome que los
  // móviles estrechos. La nota legal aparece por encima de ~700 px de ancho.
  footerCompactWide: 16,
  footerCompactNarrow: 0,
  // 14.1% de 1024×768 = 110 887 px² / (768−68−22) = 163.6 px
  railLabels: 164,
  // Declarado por styles.css:979 y :1851 para 1024–1439; hoy código muerto (F-01)
  railIcons: 76,
  // 6.9% de 390×844 = 22 712 px² / 390 = 58.2 px. Banda horizontal fija, y sólo
  // en retrato (ver CRI-9 §12: dos columnas independientes coinciden).
  railBandCompactPortrait: 58,
  // DEFAULT_INSPECTOR_WIDTH · useWorkspaceLayoutPreferences.ts:17
  detailDock: 320,
  // MIN_INSPECTOR_WIDTH = 280 · ancho del detalle superpuesto en Medium
  detailOverlayMedium: 300,
  // 22.0% de 1024×768 = 173 015 px² / 540 = 320.4 px (alto reservado siempre)
  resultsDockToday: 320,
  // ResultsPanel.tsx:339 — altura del modo `compact`
  resultsDockCompactMode: 190,
  // 6.4% de 390×844 = 21 066 px² / 390 = 54.0 px (banda colapsada)
  resultsCollapsedBand: 54,
};

/** Suelos de la regla de canvas-budget. Ver CRI-9 §12. */
export const CB = {
  /** CB-1 · coexistencia: docks e insets que conviven con el trabajo. */
  coexistenceFloor: 0.5,
  /** CB-2 · reposo: sin ninguna superficie auxiliar invocada. */
  restFloor: 0.7,
  /** CB-3 · chrome flotante sobre el lienzo. */
  floatingChromeMax: 0.12,
  /** CB-6 · detent por defecto en Compact: lienzo vivo mínimo. */
  compactDefaultDetentFloor: 0.4,
};

// ---------------------------------------------------------------------------
// 2. Las únicas tres composiciones que el resolutor puede producir
// ---------------------------------------------------------------------------

export const COMPOSITIONS = {
  X2: {
    id: 'X2',
    name: 'Expanded · dos docks laterales',
    bands: 'wide',
    rail: { mode: 'dock', width: CHROME.railLabels },
    detail: { mode: 'dock', width: CHROME.detailDock, reflow: true, persistent: true },
    dense: 'drawer',
  },
  M1: {
    id: 'M1',
    name: 'Medium · un dock lateral + detalle superpuesto',
    bands: 'wide',
    rail: { mode: 'dock', width: CHROME.railIcons },
    detail: { mode: 'overlay-inset', width: CHROME.detailOverlayMedium, reflow: false, persistent: false },
    dense: 'drawer',
  },
  K0: {
    id: 'K0',
    name: 'Compact · cero docks, capa contextual única',
    bands: 'compact',
    rail: { mode: 'band', width: 0 },
    detail: { mode: 'sheet', reflow: false, persistent: false },
    dense: 'fullscreen',
  },
};

/** Composición ACTUAL del producto. Existe sólo para calibrar contra CRI-7. */
const todayBands = (viewport, tier) => {
  if (tier === 'expanded') {
    return { top: CHROME.topBarWide, bottom: CHROME.footerWide, extra: CHROME.resultsDockToday };
  }
  const portrait = viewport.height > viewport.width;
  return {
    top: CHROME.topBarCompact,
    bottom: viewport.width >= 700 ? CHROME.footerCompactWide : CHROME.footerCompactNarrow,
    extra: CHROME.resultsCollapsedBand + (portrait ? CHROME.railBandCompactPortrait : 0),
  };
};

// ---------------------------------------------------------------------------
// 3. El cálculo
// ---------------------------------------------------------------------------

export const bands = (composition, viewport) => {
  if (composition.bands === 'wide') {
    return { top: CHROME.topBarWide, bottom: CHROME.footerWide, extra: 0 };
  }
  const portrait = viewport.height > viewport.width;
  return {
    top: CHROME.topBarCompact,
    bottom: viewport.width >= 700 ? CHROME.footerCompactWide : CHROME.footerCompactNarrow,
    // El dock de herramientas sigue siendo banda en retrato. La banda de
    // Results desaparece (D-03): su estado sube al chip de la TopBar.
    extra: portrait ? CHROME.railBandCompactPortrait : 0,
  };
};

const stageHeight = (composition, viewport, resultsHeight = 0) => {
  const band = bands(composition, viewport);
  return Math.max(0, viewport.height - band.top - band.bottom - band.extra - resultsHeight);
};

/**
 * Lado por el que llega la hoja en Compact. Es una consecuencia del modelo, no
 * una preferencia: en apaisado una hoja inferior deja el lienzo por debajo de
 * cualquier suelo utilizable (CB-6).
 */
export const compactSheetSide = (viewport) => (viewport.width > viewport.height ? 'side' : 'bottom');

export const canvasArea = (composition, viewport, { detailPresent = false, resultsHeight = 0 } = {}) => {
  const height = stageHeight(composition, viewport, resultsHeight);
  const railWidth = composition.rail.mode === 'dock' ? composition.rail.width : 0;
  let width = viewport.width - railWidth;
  let visibleHeight = height;

  if (detailPresent) {
    if (composition.detail.mode === 'dock' || composition.detail.mode === 'overlay-inset') {
      width -= composition.detail.width;
    } else if (compactSheetSide(viewport) === 'side') {
      width -= CHROME.detailDock;
    } else {
      visibleHeight = Math.round(height * CB.compactDefaultDetentFloor);
    }
  }
  width = Math.max(0, width);
  visibleHeight = Math.max(0, visibleHeight);
  return { width, height: visibleHeight, area: width * visibleHeight };
};

const share = (area, viewport) => area / (viewport.width * viewport.height);

const detailArea = (composition, viewport) => {
  const height = stageHeight(composition, viewport);
  if (composition.detail.mode !== 'sheet') return composition.detail.width * height;
  return compactSheetSide(viewport) === 'side'
    ? CHROME.detailDock * height
    : viewport.width * Math.round(height * (1 - CB.compactDefaultDetentFloor));
};

/**
 * Evalúa una composición.
 *
 * CB-1 sólo se exige a superficies que COEXISTEN con el trabajo (docks e
 * insets). Una hoja levantada explícitamente es la tarea activa, y ahí manda
 * CB-6. CB-4 sólo se exige a superficies persistentes, por la misma razón.
 */
export const evaluate = (composition, viewport, { resultsHeight = 0 } = {}) => {
  const rest = canvasArea(composition, viewport, { detailPresent: false, resultsHeight });
  const withDetail = canvasArea(composition, viewport, { detailPresent: true, resultsHeight });
  const restShare = share(rest.area, viewport);
  const detailShare = share(withDetail.area, viewport);
  const coexists = composition.detail.mode === 'dock' || composition.detail.mode === 'overlay-inset';
  const cb1 = coexists ? detailShare >= CB.coexistenceFloor : true;
  const cb2 = restShare >= CB.restFloor;
  const cb4 = composition.detail.persistent ? detailArea(composition, viewport) <= withDetail.area : true;
  const stage = stageHeight(composition, viewport, resultsHeight);
  const railWidth = composition.rail.mode === 'dock' ? composition.rail.width : 0;
  const liveStageShare = stage === 0 ? 0 : withDetail.area / ((viewport.width - railWidth) * stage);
  const cb6 = coexists ? true : liveStageShare >= CB.compactDefaultDetentFloor;
  return {
    composition: composition.id,
    name: composition.name,
    restShare,
    detailShare,
    cb1,
    cb2,
    cb4,
    cb6,
    passes: cb1 && cb2 && cb4 && cb6,
    restBox: rest,
    detailBox: withDetail,
    sheetSide: composition.detail.mode === 'sheet' ? compactSheetSide(viewport) : null,
    railMode: composition.rail.mode,
    railWidth,
    detailMode: composition.detail.mode,
    detailWidth: composition.detail.width ?? null,
    denseMode: composition.dense,
    bands: bands(composition, viewport),
  };
};

/**
 * El resolutor: elige la composición MÁS RICA que cumple CB. El orden es
 * deliberado; la clase de espacio es la SALIDA del presupuesto, no una etiqueta
 * de ancho de entrada. Nadie escribe «1024».
 */
export const resolveComposition = (viewport, { resultsHeight = 0 } = {}) => {
  for (const id of ['X2', 'M1', 'K0']) {
    const verdict = evaluate(COMPOSITIONS[id], viewport, { resultsHeight });
    if (verdict.passes) return verdict;
  }
  return evaluate(COMPOSITIONS.K0, viewport, { resultsHeight });
};

/**
 * T-INV-5 · histéresis en la frontera.
 *
 * Un arrastre continuo de split-screen no puede producir una cascada de
 * recomposiciones. La regla: para ABANDONAR la composición previa hay que
 * superar la frontera por `bandPx`; dentro de la banda se conserva la anterior.
 *
 * `bandPx` es U-13, un unknown que CRI-9 dejó abierto para medir en CRI-11. No
 * es una constante de diseño: es el parámetro del experimento.
 */
export const resolveWithHysteresis = (viewport, previous = null, { bandPx = 24, resultsHeight = 0 } = {}) => {
  const direct = resolveComposition(viewport, { resultsHeight });
  if (!previous || previous === direct.composition) return { ...direct, heldByHysteresis: false };
  const rank = { X2: 2, M1: 1, K0: 0 };
  // Sólo se retiene al ESTRECHAR (bajar de rango). Al ensanchar, subir de
  // composición es siempre seguro: ninguna regla CB se rompe por tener más sitio.
  if (rank[direct.composition] >= rank[previous]) return { ...direct, heldByHysteresis: false };
  const widened = resolveComposition({ width: viewport.width + bandPx, height: viewport.height }, { resultsHeight });
  if (widened.composition === previous) {
    return { ...evaluate(COMPOSITIONS[previous], viewport, { resultsHeight }), heldByHysteresis: true };
  }
  return { ...direct, heldByHysteresis: false };
};

/**
 * Rectángulo seguro: el área del lienzo que ninguna superficie superpuesta
 * tapa. En Medium y Compact el lienzo NO se recompone (D-01); lo que se reduce
 * es esto. La cámara no se mueve.
 */
export const safeRect = (verdict, viewport, { detailPresent = false, floatingInsets = {} } = {}) => {
  const band = verdict.bands;
  const top = band.top + (floatingInsets.top ?? 0);
  const bottom = band.bottom + band.extra + (floatingInsets.bottom ?? 0);
  const left = verdict.railMode === 'dock' ? verdict.railWidth : (floatingInsets.left ?? 0);
  let right = floatingInsets.right ?? 0;
  let sheetBottom = bottom;

  if (detailPresent) {
    if (verdict.detailMode === 'dock') right += verdict.detailWidth ?? 0; // reflow: ya restado del lienzo
    else if (verdict.detailMode === 'overlay-inset') right += verdict.detailWidth ?? 0;
    else if (verdict.sheetSide === 'side') right += CHROME.detailDock;
    else sheetBottom += Math.round((viewport.height - band.top - band.bottom - band.extra) * (1 - CB.compactDefaultDetentFloor));
  }

  return {
    top,
    right,
    bottom: sheetBottom,
    left,
    width: Math.max(0, viewport.width - left - right),
    height: Math.max(0, viewport.height - top - sheetBottom),
  };
};

/** ¿Cabe fijar (pin) el dock de datos densos sin romper CB-1 y CB-4? */
export const denseDockAffordable = (viewport) => {
  if (resolveComposition(viewport).composition !== 'X2') return false;
  const pinned = evaluate(COMPOSITIONS.X2, viewport, { resultsHeight: CHROME.resultsDockCompactMode });
  return pinned.cb1 && pinned.cb4;
};

/** Frontera Expanded↔Medium para una altura dada, por barrido. */
export const expandedBoundary = (height) => {
  for (let width = 640; width <= 3840; width += 1) {
    if (resolveComposition({ width, height }).composition === 'X2') return width;
  }
  return null;
};

// ---------------------------------------------------------------------------
// 4. Calibración contra CRI-7 §2 — si esto falla, el port no vale
// ---------------------------------------------------------------------------

/** Cifras publicadas por CRI-7 §2, columna «canvas % vp». */
export const CRI7_MEASURED = [
  { label: '320×568', width: 320, height: 568, tier: 'compact', canvasPct: 71.8 },
  { label: '360×800', width: 360, height: 800, tier: 'compact', canvasPct: 80.0 },
  { label: '375×667', width: 375, height: 667, tier: 'compact', canvasPct: 76.0 },
  { label: '390×844', width: 390, height: 844, tier: 'compact', canvasPct: 81.0 },
  { label: '844×390', width: 844, height: 390, tier: 'compact', canvasPct: 69.5 },
  { label: '768×1024', width: 768, height: 1024, tier: 'compact', canvasPct: 82.8 },
  { label: '900×1000', width: 900, height: 1000, tier: 'compact', canvasPct: 82.4 },
  { label: '1024×768', width: 1024, height: 768, tier: 'expanded', canvasPct: 24.6 },
  { label: '1280×800', width: 1280, height: 800, tier: 'expanded', canvasPct: 30.3 },
  { label: '1440×900', width: 1440, height: 900, tier: 'expanded', canvasPct: 36.1 },
  { label: '1536×960', width: 1536, height: 960, tier: 'expanded', canvasPct: 39.2 },
];

/** Reproduce la composición ACTUAL, para comparar con lo que CRI-7 midió. */
export const modelToday = (viewport, tier) => {
  const band = todayBands(viewport, tier);
  const railWidth = tier === 'expanded' ? CHROME.railLabels : 0;
  const detailWidth = tier === 'expanded' ? CHROME.detailDock : 0;
  const width = viewport.width - railWidth - detailWidth;
  const height = viewport.height - band.top - band.bottom - band.extra;
  return (width * height) / (viewport.width * viewport.height);
};

export const calibrate = () =>
  CRI7_MEASURED.map((row) => {
    const modelled = modelToday(row, row.tier) * 100;
    return { ...row, modelled, delta: modelled - row.canvasPct };
  });

/** Presets del harness. Los once de CRI-7 más los que CRI-9 usó para predecir. */
export const VIEWPORT_PRESETS = [
  { id: '320x568', label: '320×568 · móvil mínimo', width: 320, height: 568 },
  { id: '390x844', label: '390×844 · móvil', width: 390, height: 844 },
  { id: '844x390', label: '844×390 · móvil apaisado', width: 844, height: 390 },
  { id: '768x1024', label: '768×1024 · tablet retrato', width: 768, height: 1024 },
  { id: '900x1000', label: '900×1000 · split-screen', width: 900, height: 1000 },
  { id: '1024x768', label: '1024×768 · portátil corriente', width: 1024, height: 768 },
  { id: '1112x834', label: '1112×834 · tablet apaisada', width: 1112, height: 834 },
  { id: '1280x800', label: '1280×800', width: 1280, height: 800 },
  { id: '1440x900', label: '1440×900', width: 1440, height: 900 },
  { id: '1920x1080', label: '1920×1080', width: 1920, height: 1080 },
];
