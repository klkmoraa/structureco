/**
 * Geometría del pórtico clay de la bienvenida.
 *
 * Es aritmética, no dibujo: define el pórtico en coordenadas de mundo y lo
 * proyecta a 2D con una matriz isométrica, devolviendo caras ya ordenadas por
 * profundidad y ya sombreadas contra una única fuente de luz. El componente
 * que lo consume sólo pinta.
 *
 * Esa frontera es lo que permite testear la figura con asserts numéricos en
 * jsdom, sin render y sin WebGL — y lo que permitiría sustituir el motor de
 * pintura sin volver a derivar la geometría.
 *
 * La luz es la misma que la de la materia clay: arriba-izquierda, a 145°.
 * Si cambia en `tokens.css`, cambia aquí.
 */

export interface Vec3 { x: number; y: number; z: number }
export interface Point2 { x: number; y: number }

export type MaterialId = 'column' | 'beam' | 'base' | 'capital';

export interface Face {
  id: string;
  material: MaterialId;
  points: Point2[];
  /** 0 = cara en sombra, 1 = cara de cara a la luz. */
  shade: number;
  /** Mayor = más cerca del observador. */
  depth: number;
}

export interface PortalDimensions {
  columnWidth: number;
  columnHeight: number;
  columnDepth: number;
  beamHeight: number;
  beamModules: number;
  baseWidth: number;
  baseHeight: number;
  span: number;
}

/** Proporciones del pórtico de la referencia: ancho, achaparrado y estable. */
export const DEFAULT_PORTAL: PortalDimensions = {
  columnWidth: 22,
  columnHeight: 116,
  columnDepth: 22,
  beamHeight: 26,
  beamModules: 4,
  baseWidth: 40,
  baseHeight: 14,
  span: 150,
};

/** Isométrica clásica 2:1. `y` del mundo sube; en pantalla, baja. */
const ISO_X = Math.cos(Math.PI / 6);
const ISO_Y = Math.sin(Math.PI / 6);

export const projectIso = (v: Vec3): Point2 => ({
  x: (v.z - v.x) * ISO_X,
  y: (v.x + v.z) * ISO_Y - v.y,
});

/** Luz normalizada arriba-izquierda-frente. Coincide con los 145° de la materia clay. */
const LIGHT: Vec3 = (() => {
  const raw = { x: -0.55, y: 0.75, z: -0.37 };
  const length = Math.hypot(raw.x, raw.y, raw.z);
  return { x: raw.x / length, y: raw.y / length, z: raw.z / length };
})();

/** Normales de las tres caras visibles en isométrica. Las ocultas no se emiten. */
const NORMALS: Record<'top' | 'left' | 'right', Vec3> = {
  top: { x: 0, y: 1, z: 0 },
  left: { x: -1, y: 0, z: 0 },
  right: { x: 0, y: 0, z: 1 },
};

/**
 * Lambert con un suelo ambiental. Sin el suelo, la cara derecha cae a negro y
 * el objeto deja de leerse como una pieza de un solo material.
 */
const AMBIENT = 0.34;
const shadeOf = (normal: Vec3) => {
  const lambert = normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z;
  return Math.min(1, Math.max(0, AMBIENT + (1 - AMBIENT) * Math.max(0, lambert)));
};

interface Box { x: number; y: number; z: number; w: number; h: number; d: number }

/**
 * Emite las tres caras visibles de una caja. Las otras tres quedan fuera:
 * en isométrica sin transparencia nunca se ven, y emitirlas duplicaría el
 * número de `<path>` del SVG sin cambiar un píxel.
 */
const boxFaces = (id: string, material: MaterialId, box: Box): Face[] => {
  const { x, y, z, w, h, d } = box;
  /*
   * `projectIso` invierte x en pantalla (screen-x = (z - x) * ISO_X, ver su
   * propio test "mirrors x and z"). Como las dos columnas se separan a lo
   * largo de +x mundial, sin corregir esto la columna que crece con `span`
   * se desplazaría hacia la IZQUIERDA en pantalla — lo contrario de lo que
   * pide un pórtico "más ancho". Se refleja aquí, sólo para el ensamblado
   * del pórtico, sin tocar `projectIso` (frontera ya testeada tal cual).
   */
  const corner = (dx: number, dy: number, dz: number) => {
    const p = projectIso({ x: x + dx, y: y + dy, z: z + dz });
    return { x: -p.x, y: p.y };
  };
  const depth = x + y + z + (w + h + d) / 2;

  return [
    {
      id: `${id}:top`,
      material,
      shade: shadeOf(NORMALS.top),
      depth,
      points: [corner(0, h, 0), corner(w, h, 0), corner(w, h, d), corner(0, h, d)],
    },
    {
      id: `${id}:left`,
      material,
      shade: shadeOf(NORMALS.left),
      depth,
      points: [corner(0, h, 0), corner(0, h, d), corner(0, 0, d), corner(0, 0, 0)],
    },
    {
      id: `${id}:right`,
      material,
      shade: shadeOf(NORMALS.right),
      depth,
      points: [corner(0, h, d), corner(w, h, d), corner(w, 0, d), corner(0, 0, d)],
    },
  ];
};

export const buildPortal = (dims: PortalDimensions = DEFAULT_PORTAL): Face[] => {
  const { columnWidth: cw, columnHeight: ch, columnDepth: cd, beamHeight: bh, beamModules, baseWidth: bw, baseHeight: bhh, span } = dims;
  const faces: Face[] = [];

  /* Dos columnas. `span` es la distancia entre sus caras exteriores. */
  const columnX = [0, span - cw];
  const centreOffset = (bw - cw) / 2;

  for (const [index, x] of columnX.entries()) {
    const side = index === 0 ? 'l' : 'r';

    /* Base: dos cajas apiladas, la de abajo más ancha. */
    faces.push(...boxFaces(`base-${side}-lower`, 'base', {
      x: x - centreOffset, y: 0, z: -centreOffset, w: bw, h: bhh, d: bw,
    }));
    faces.push(...boxFaces(`base-${side}-upper`, 'base', {
      x: x - centreOffset / 2, y: bhh, z: -centreOffset / 2,
      w: cw + centreOffset, h: bhh * 0.7, d: cd + centreOffset,
    }));

    const columnBase = bhh + bhh * 0.7;
    faces.push(...boxFaces(`column-${side}`, 'column', {
      x, y: columnBase, z: 0, w: cw, h: ch, d: cd,
    }));

    /* Capitel: un escalón muy leve entre columna y dintel. */
    faces.push(...boxFaces(`capital-${side}`, 'capital', {
      x: x - 2, y: columnBase + ch, z: -2, w: cw + 4, h: 5, d: cd + 4,
    }));
  }

  /* Dintel dividido en módulos. Se emiten como cajas independientes para que
     la junta entre módulos exista de verdad y no sea una línea pintada. */
  const beamY = bhh + bhh * 0.7 + ch + 5;
  const moduleWidth = span / beamModules;
  for (let i = 0; i < beamModules; i += 1) {
    faces.push(...boxFaces(`beam:${i}`, 'beam', {
      x: i * moduleWidth, y: beamY, z: 0, w: moduleWidth - 1.5, h: bh, d: cd,
    }));
  }

  /* Pintor: de atrás hacia delante. Es el orden en el que hay que dibujarlas. */
  return faces.sort((a, b) => a.depth - b.depth);
};
