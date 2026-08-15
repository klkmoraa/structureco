/* CRI-10 · pórtico 3D de la Welcome — recuperación del hero real.
 *
 * Puerto directo de la geometría de `src/graphics/isometricPortal.ts` +
 * `src/features/welcome/StructuralPortalHero.tsx` al pipeline vanilla de estos
 * conceptos (no hay React ni build de la app aquí). Es aritmética copiada, no
 * reinventada: misma proyección isométrica 2:1, misma fuente de luz, mismas
 * proporciones de `DEFAULT_PORTAL`, mismo criterio de sombreado por cara y el
 * mismo umbral de sombra de contacto (Monte Carlo, s=0.75) documentado en el
 * componente real. Si `isometricPortal.ts` cambia, este archivo hay que
 * volver a copiarlo — no hay import cruzado hacia `src/**` porque el pipeline
 * de conceptos no ejecuta TypeScript ni bundler.
 *
 * Lo que SÍ cambia a propósito frente al componente real:
 *   · Sin inclinación por puntero (`--tilt-x/y`): es una lámina estática.
 *   · Sin el halo ambiental que tenía `.welcome-hero-figure::before` — ese
 *     halo ya fue retirado en `src/styles.css` (sección «IDENTIDAD OFICIAL
 *     CLAY», que gana la cascada sobre la regla original) y esta pieza nueva
 *     no lo reintroduce. Sólo se conserva la sombra de contacto NEUTRA bajo
 *     cada zapata (borrosa pero sin color de marca) — es sombra física, no luz.
 */

const ISO_X = Math.cos(Math.PI / 6);
const ISO_Y = Math.sin(Math.PI / 6);

const projectIso = (v) => ({
  x: (v.x - v.z) * ISO_X,
  y: (v.x + v.z) * ISO_Y - v.y,
});

const DEFAULT_PORTAL = {
  columnWidth: 22, columnHeight: 116, columnDepth: 22,
  beamHeight: 26, beamModules: 4,
  baseWidth: 40, baseHeight: 14, span: 150,
};

const LIGHT = (() => {
  const raw = { x: 0.37, y: 0.75, z: 0.55 };
  const length = Math.hypot(raw.x, raw.y, raw.z);
  return { x: raw.x / length, y: raw.y / length, z: raw.z / length };
})();

const NORMALS = {
  top: { x: 0, y: 1, z: 0 },
  left: { x: 0, y: 0, z: 1 },
  right: { x: 1, y: 0, z: 0 },
};

const AMBIENT = 0.34;
const shadeOf = (normal) => {
  const lambert = normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z;
  return Math.min(1, Math.max(0, AMBIENT + (1 - AMBIENT) * Math.max(0, lambert)));
};

const boxFaces = (id, material, box) => {
  const { x, y, z, w, h, d } = box;
  const corner = (dx, dy, dz) => projectIso({ x: x + dx, y: y + dy, z: z + dz });
  const depth = x + y + z + (w + h + d) / 2;
  return [
    { id: `${id}:top`, material, shade: shadeOf(NORMALS.top), depth, points: [corner(0, h, 0), corner(w, h, 0), corner(w, h, d), corner(0, h, d)] },
    { id: `${id}:left`, material, shade: shadeOf(NORMALS.left), depth, points: [corner(0, h, d), corner(w, h, d), corner(w, 0, d), corner(0, 0, d)] },
    { id: `${id}:right`, material, shade: shadeOf(NORMALS.right), depth, points: [corner(w, h, 0), corner(w, 0, 0), corner(w, 0, d), corner(w, h, d)] },
  ];
};

const buildPortal = (dims = DEFAULT_PORTAL) => {
  const { columnWidth: cw, columnHeight: ch, columnDepth: cd, beamHeight: bh, beamModules, baseWidth: bw, baseHeight: bhh, span } = dims;
  const faces = [];
  const columnX = [0, span - cw];
  const centreOffset = (bw - cw) / 2;
  for (const [index, x] of columnX.entries()) {
    const side = index === 0 ? 'l' : 'r';
    faces.push(...boxFaces(`base-${side}-lower`, 'base', { x: x - centreOffset, y: 0, z: -centreOffset, w: bw, h: bhh, d: bw }));
    faces.push(...boxFaces(`base-${side}-upper`, 'base', { x: x - centreOffset / 2, y: bhh, z: -centreOffset / 2, w: cw + centreOffset, h: bhh * 0.7, d: cd + centreOffset }));
    const columnBase = bhh + bhh * 0.7;
    faces.push(...boxFaces(`column-${side}`, 'column', { x, y: columnBase, z: 0, w: cw, h: ch, d: cd }));
    faces.push(...boxFaces(`capital-${side}`, 'capital', { x: x - 2, y: columnBase + ch, z: -2, w: cw + 4, h: 5, d: cd + 4 }));
  }
  const beamY = bhh + bhh * 0.7 + ch + 5;
  const beamGap = 1.5;
  const moduleWidth = (span - beamGap * (beamModules - 1)) / beamModules;
  for (let i = 0; i < beamModules; i += 1) {
    faces.push(...boxFaces(`beam:${i}`, 'beam', { x: i * (moduleWidth + beamGap), y: beamY, z: 0, w: moduleWidth, h: bh, d: cd }));
  }
  return faces.sort((a, b) => a.depth - b.depth);
};

const MATERIAL_TOKEN = {
  column: 'var(--sc-color-clay-ivory)',
  beam: 'var(--sc-color-clay-lime)',
  base: 'var(--sc-color-clay-lime-deep)',
  capital: 'var(--sc-color-clay-ivory-deep)',
};

const GRID_INDICES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const GRID_MARGIN = 20;
const CONTACT_SHADOW_SCALE = 0.75;

const footprintOf = (columnIndex) => {
  const { baseWidth, columnWidth, span } = DEFAULT_PORTAL;
  const centreOffset = (baseWidth - columnWidth) / 2;
  const columnX = [0, span - columnWidth];
  return { x: columnX[columnIndex] - centreOffset, z: -centreOffset, w: baseWidth, d: baseWidth };
};

const contactEllipseOf = (footprint) => {
  const corners = [
    projectIso({ x: footprint.x, y: 0, z: footprint.z }),
    projectIso({ x: footprint.x + footprint.w, y: 0, z: footprint.z }),
    projectIso({ x: footprint.x + footprint.w, y: 0, z: footprint.z + footprint.d }),
    projectIso({ x: footprint.x, y: 0, z: footprint.z + footprint.d }),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: ((maxX - minX) / 2) * CONTACT_SHADOW_SCALE,
    ry: ((maxY - minY) / 2) * CONTACT_SHADOW_SCALE,
  };
};

const toPath = (face) => `${face.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')} Z`;

/**
 * Devuelve el `<svg>` del pórtico como string, listo para insertar. Mismo
 * `viewBox` que `StructuralPortalHero.tsx` (calculado sobre el bounding box
 * real de `buildPortal()`), mismo mecanismo de sombreado por `--face-shade`
 * + `filter:brightness()` (ver `concepts.css`), misma sombra de contacto
 * neutra por zapata. `extraClass` permite variar el tamaño por lámina sin
 * duplicar el módulo.
 */
export const porticoHero = (extraClass = '') => {
  const faces = buildPortal();
  const footprints = [footprintOf(0), footprintOf(1)];
  const footEllipses = footprints.map(contactEllipseOf);

  const xMin = Math.min(...footprints.map((f) => f.x)) - GRID_MARGIN;
  const xMax = Math.max(...footprints.map((f) => f.x + f.w)) + GRID_MARGIN;
  const zMin = Math.min(...footprints.map((f) => f.z)) - GRID_MARGIN;
  const zMax = Math.max(...footprints.map((f) => f.z + f.d)) + GRID_MARGIN;

  const groundLines = GRID_INDICES.map((i) => {
    const t = (i + 4) / 8;
    const xAt = xMin + t * (xMax - xMin);
    const zAt = zMin + t * (zMax - zMin);
    return {
      constX: { p1: projectIso({ x: xAt, y: 0, z: zMin }), p2: projectIso({ x: xAt, y: 0, z: zMax }) },
      constZ: { p1: projectIso({ x: xMin, y: 0, z: zAt }), p2: projectIso({ x: xMax, y: 0, z: zAt }) },
    };
  });

  const groundSvg = groundLines.map(({ constX, constZ }) => `
    <line x1="${constX.p1.x.toFixed(2)}" y1="${constX.p1.y.toFixed(2)}" x2="${constX.p2.x.toFixed(2)}" y2="${constX.p2.y.toFixed(2)}"/>
    <line x1="${constZ.p1.x.toFixed(2)}" y1="${constZ.p1.y.toFixed(2)}" x2="${constZ.p2.x.toFixed(2)}" y2="${constZ.p2.y.toFixed(2)}"/>`).join('');

  const contactSvg = footEllipses.map((e) => `<ellipse class="portico3d__contact" cx="${e.cx.toFixed(2)}" cy="${e.cy.toFixed(2)}" rx="${e.rx.toFixed(2)}" ry="${e.ry.toFixed(2)}"/>`).join('');

  const facesSvg = faces.map((face) => `<path class="portico3d__face" d="${toPath(face)}" fill="${MATERIAL_TOKEN[face.material]}" style="--face-shade:${face.shade.toFixed(3)}"/>`).join('');

  return `<svg class="portico3d ${extraClass}" viewBox="-90 -190 290 325" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Pórtico de dos crujías, vista isométrica" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <g class="portico3d__ground">${groundSvg}</g>
    ${contactSvg}
    ${facesSvg}
  </svg>`;
};
