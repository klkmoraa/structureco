/**
 * Restricción angular al trazar una barra (tecla Mayús).
 *
 * Dibujar un pórtico exigía hasta ahora confiar en la retícula: sin una
 * dirección fija, una columna «vertical» acababa a 89.6° si el puntero se movía
 * un píxel de más, y la única salida exacta era escribir longitud y ángulo en la
 * barra de entrada. Con Mayús pulsada el punto se proyecta sobre el múltiplo de
 * 15° más cercano al origen del trazo, que es como se dibuja en cualquier
 * tablero técnico.
 *
 * El módulo es geometría pura: no toca el modelo, no decide cuándo se aplica y
 * no conoce la cámara.
 */
export interface ConstraintOrigin {
  x: number;
  y: number;
}

export interface ConstrainedPoint {
  x: number;
  y: number;
  /** Ángulo resultante en grados, medido en coordenadas de modelo desde +x. */
  angleDeg: number;
  /** Distancia al origen del trazo. */
  length: number;
}

/** Paso angular del tablero: 15° cubre 0, 30, 45, 60 y 90 sin ser tupido. */
export const ANGLE_CONSTRAINT_STEP_DEG = 15;

export interface AngleConstraintOptions {
  stepDeg?: number;
  /**
   * Cuando es mayor que cero, la distancia también cae sobre un múltiplo de este
   * paso. Es la forma de que la restricción angular y la imantación a retícula
   * convivan: el ángulo manda y la longitud sigue siendo redonda.
   */
  radiusStep?: number;
}

const finite = (value: number): boolean => Number.isFinite(value);

/** Ángulo en grados dentro de `(-180, 180]`, sin `-0`. */
export const normalizeAngleDeg = (angleDeg: number): number => {
  if (!finite(angleDeg)) return 0;
  const wrapped = ((angleDeg % 360) + 360) % 360;
  const signed = wrapped > 180 ? wrapped - 360 : wrapped;
  return signed === 0 ? 0 : signed;
};

/**
 * Proyecta `point` sobre la dirección permitida más cercana a `origin`.
 *
 * Un punto que coincide con el origen no tiene dirección: se devuelve tal cual
 * con longitud cero, para que el trazo no salte a un ángulo inventado mientras
 * el puntero todavía no se ha movido.
 */
export const constrainToAngleStep = (
  origin: ConstraintOrigin,
  point: ConstraintOrigin,
  options: AngleConstraintOptions = {},
): ConstrainedPoint => {
  const stepDeg = finite(options.stepDeg ?? NaN) && (options.stepDeg as number) > 0
    ? options.stepDeg as number
    : ANGLE_CONSTRAINT_STEP_DEG;
  if (![origin.x, origin.y, point.x, point.y].every(finite)) {
    return { x: origin.x, y: origin.y, angleDeg: 0, length: 0 };
  }
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const rawLength = Math.hypot(dx, dy);
  if (rawLength <= 1e-12) return { x: origin.x, y: origin.y, angleDeg: 0, length: 0 };

  const angleDeg = normalizeAngleDeg(Math.round((Math.atan2(dy, dx) * 180) / Math.PI / stepDeg) * stepDeg);
  const radians = (angleDeg * Math.PI) / 180;
  const radiusStep = options.radiusStep ?? 0;
  const length = finite(radiusStep) && radiusStep > 0
    ? Math.max(radiusStep, Math.round(rawLength / radiusStep) * radiusStep)
    : rawLength;
  return {
    x: origin.x + length * Math.cos(radians),
    y: origin.y + length * Math.sin(radians),
    angleDeg,
    length,
  };
};
