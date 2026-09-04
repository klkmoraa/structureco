import type { CanvasCamera, ViewportSize } from './canvasInteraction';

/**
 * Retícula adaptativa del lienzo 2D.
 *
 * La retícula anterior dibujaba un `<line>` por división a la separación exacta
 * de `gridSize` y desaparecía por completo por debajo de 8 px. Eso dejaba dos
 * agujeros de lectura: alejado, el dibujo se quedaba sin referencia métrica
 * justo cuando más falta hace; y acercado, cada desplazamiento reconstruía
 * cientos de nodos del DOM.
 *
 * Aquí la separación se **engorda** por múltiplos enteros del paso de snap
 * —1, 2, 5, 10, …— para que toda línea dibujada siga cayendo sobre un punto
 * de imantación, nunca entre dos. La retícula pasa a tres trazos: divisiones
 * menores, una mayor cada `majorEvery` divisiones y los ejes del modelo.
 */
export interface CanvasGridPlan {
  /** Separación en unidades de modelo realmente dibujada. */
  step: number;
  /** Separación en píxeles de esa división. */
  stepPx: number;
  /** Una de cada `majorEvery` divisiones se dibuja como línea mayor. */
  majorEvery: number;
  /** `d` de las divisiones menores. Cadena vacía si no hay ninguna. */
  minor: string;
  /** `d` de las divisiones mayores. */
  major: string;
  /** `d` de los ejes X = 0 e Y = 0 cuando cruzan el encuadre. */
  axes: string;
}

/** Por debajo de esto la retícula se lee como una trama sólida y estorba. */
export const MIN_GRID_STEP_PX = 9;
/** Una división mayor por debajo de esto deja de servir como referencia. */
const MIN_MAJOR_STEP_PX = 52;
/** Tope de seguridad: ninguna cámara válida se acerca a este número de líneas. */
const MAX_GRID_LINES = 900;

/**
 * Múltiplos enteros del paso de imantación. Sólo se engorda: subdividir por
 * debajo de `gridSize` dibujaría líneas sobre las que el puntero no imanta.
 */
const STEP_MULTIPLIERS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000] as const;

/** Primer múltiplo del paso de imantación que se lee sin apelmazarse. */
export const gridStepMultiplier = (baseStepPx: number, minimumPx = MIN_GRID_STEP_PX): number => {
  if (!Number.isFinite(baseStepPx) || baseStepPx <= 0) return STEP_MULTIPLIERS[STEP_MULTIPLIERS.length - 1];
  for (const multiplier of STEP_MULTIPLIERS) {
    if (baseStepPx * multiplier >= minimumPx) return multiplier;
  }
  return STEP_MULTIPLIERS[STEP_MULTIPLIERS.length - 1];
};

/** Cada cuántas divisiones cae una línea mayor, según lo apretadas que queden. */
export const gridMajorEvery = (stepPx: number): number =>
  (stepPx * 5 >= MIN_MAJOR_STEP_PX ? 5 : 10);

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Resuelve la retícula visible. Devuelve `null` cuando no hay nada que dibujar
 * —cámara degenerada o encuadre sin superficie—, para que la capa no monte un
 * grupo vacío.
 */
export const planCanvasGrid = (
  camera: CanvasCamera,
  viewport: ViewportSize,
  gridSize: number,
): CanvasGridPlan | null => {
  const { scale, x: cameraX, y: cameraY } = camera;
  const { width, height } = viewport;
  if (![scale, cameraX, cameraY, width, height].every(Number.isFinite)) return null;
  if (scale <= 0 || width <= 0 || height <= 0) return null;

  const base = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 1;
  const step = base * gridStepMultiplier(base * scale);
  const stepPx = step * scale;
  if (!Number.isFinite(stepPx) || stepPx < MIN_GRID_STEP_PX) return null;
  if ((width / stepPx) + (height / stepPx) > MAX_GRID_LINES) return null;

  const majorEvery = gridMajorEvery(stepPx);
  const minor: string[] = [];
  const major: string[] = [];
  const axes: string[] = [];

  // Índice de la primera vertical visible: el modelo manda, la pantalla sigue.
  const firstColumn = Math.ceil(-cameraX / stepPx);
  for (let index = firstColumn; ; index += 1) {
    const screenX = round(cameraX + index * stepPx);
    if (screenX > width) break;
    const command = `M${screenX} 0V${round(height)}`;
    if (index === 0) axes.push(command);
    else if (index % majorEvery === 0) major.push(command);
    else minor.push(command);
  }

  const firstRow = Math.ceil((cameraY - height) / stepPx);
  for (let index = firstRow; ; index += 1) {
    const screenY = round(cameraY - index * stepPx);
    if (screenY < 0) break;
    const command = `M0 ${screenY}H${round(width)}`;
    if (index === 0) axes.push(command);
    else if (index % majorEvery === 0) major.push(command);
    else minor.push(command);
  }

  return {
    step,
    stepPx,
    majorEvery,
    minor: minor.join(''),
    major: major.join(''),
    axes: axes.join(''),
  };
};
