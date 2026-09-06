export type ReactionDisplayMode = 'cartesian' | 'polar' | 'both';

export interface PolarReactionData {
  rNet: number;
  thetaRad: number;
  thetaDeg: number;
  screenVector: { ux: number; uy: number };
  hasForce: boolean;
  hasMoment: boolean;
  rm: number;
}

/**
 * Computes polar reaction magnitude, angle, and screen unit vector from
 * Cartesian reaction components (Rx, Ry, Rm).
 */
export const computePolarReaction = (
  rx: number,
  ry: number,
  rm = 0,
): PolarReactionData => {
  const rNet = Math.hypot(rx, ry);
  const hasForce = rNet > 1e-8;
  const hasMoment = Math.abs(rm) > 1e-8;

  let thetaRad = 0;
  let thetaDeg = 0;
  let ux = 0;
  let uy = 0;

  if (hasForce) {
    thetaRad = Math.atan2(ry, rx);
    thetaDeg = (thetaRad * 180) / Math.PI;
    if (thetaDeg < 0) thetaDeg += 360;

    // Screen Y is inverted relative to mathematical Cartesian Y
    ux = rx / rNet;
    uy = -ry / rNet;
  }

  return {
    rNet,
    thetaRad,
    thetaDeg,
    screenVector: { ux, uy },
    hasForce,
    hasMoment,
    rm,
  };
};

/**
 * Generates an SVG path for an angular arc centered at (cx, cy) from 0 radians
 * (horizontal right) to thetaRad in screen coordinates.
 */
export const polarAngleArcPath = (
  cx: number,
  cy: number,
  radius: number,
  thetaRad: number,
): string => {
  if (Math.abs(thetaRad) < 1e-4) return '';

  // Start at 0 radians (horizontal right on screen: x = cx + radius, y = cy)
  const startX = cx + radius;
  const startY = cy;

  // In screen coordinates, positive mathematical angle (counter-clockwise) moves towards -y
  const endX = cx + radius * Math.cos(thetaRad);
  const endY = cy - radius * Math.sin(thetaRad);

  // Large arc flag: true if angle > pi or angle < -pi
  const normalizedAngle = ((thetaRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const largeArcFlag = normalizedAngle > Math.PI ? 1 : 0;
  // Sweep flag 0: counter-clockwise in screen space (which is positive Cartesian math)
  const sweepFlag = 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
};

/**
 * Generates an orbital torque arc for reactive moment Rm.
 */
export const reactiveTorquePath = (
  cx: number,
  cy: number,
  radius: number,
  rm: number,
): { path: string; arrowTip: { x: number; y: number } } => {
  const clockwise = rm < 0;
  // Arc covering ~240 degrees
  const startAngle = clockwise ? 0.2 : Math.PI - 0.2;
  const endAngle = clockwise ? Math.PI + 1.2 : 2 * Math.PI - 0.2;

  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);

  const sweep = clockwise ? 1 : 0;
  const path = `M ${startX} ${startY} A ${radius} ${radius} 0 1 ${sweep} ${endX} ${endY}`;

  return { path, arrowTip: { x: endX, y: endY } };
};
