/**
 * Genera la escena estructural del video ejecutando el motor real de structureCo.
 *
 * El video muestra un pórtico con su deformada, su diagrama de momentos y sus
 * reacciones. Esas curvas y esos números NO están dibujados a mano: se obtienen
 * llamando a `analyzeProject` de `src/engine/solver.ts`, el mismo solver que usa
 * la aplicación, y se congelan en `src/data/escena-portico.json`.
 *
 * Así el motion graphics no puede desviarse de lo que el producto calcula: si el
 * motor cambia, se vuelve a correr este script y el video cambia con él.
 *
 *   node scripts/generar-escena.mjs
 *
 * No modifica nada de `src/**` de la aplicación: sólo lee el motor a través de
 * Vite en modo SSR.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const aqui = dirname(fileURLToPath(import.meta.url));
const raizApp = resolve(aqui, '../..');
const destino = resolve(aqui, '../src/data/escena-portico.json');

const servidor = await createServer({
  root: raizApp,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn',
});

/** @type {{ analyzeProject: Function }} */
const { analyzeProject } = await servidor.ssrLoadModule('/src/engine/solver.ts');

// Pórtico de un vano: dos columnas empotradas de 4 m y una viga de 6 m.
// Acero, E = 200 GPa; sección con A = 0.012 m² e I = 1.2e-4 m⁴.
const E = 200e6; // kN/m²
const A = 0.012; // m²
const I = 1.2e-4; // m⁴

const proyecto = {
  schemaVersion: 1,
  id: 'video-portico',
  name: 'Pórtico de un vano',
  nodes: [
    { id: 'N1', x: 0, y: 0, support: { type: 'fixed' } },
    { id: 'N2', x: 0, y: 4, support: { type: 'none' } },
    { id: 'N3', x: 6, y: 4, support: { type: 'none' } },
    { id: 'N4', x: 6, y: 0, support: { type: 'fixed' } },
  ],
  members: [
    { id: 'M1', i: 'N1', j: 'N2', type: 'frame', E, A, I },
    { id: 'M2', i: 'N2', j: 'N3', type: 'frame', E, A, I },
    { id: 'M3', i: 'N4', j: 'N3', type: 'frame', E, A, I },
  ],
  loadCases: [{ id: 'LC1', name: 'Servicio', category: 'variable', active: true }],
  combinations: [],
  // Carga gravitatoria repartida sobre la viga + empuje horizontal en el nudo
  // superior izquierdo: da flexión y desplome a la vez, que es justo lo que
  // hace legible una deformada en pantalla.
  nodalLoads: [{ id: 'H', nodeId: 'N2', caseId: 'LC1', fx: 30, fy: 0, mz: 0 }],
  memberLoads: [
    {
      id: 'Q',
      memberId: 'M2',
      caseId: 'LC1',
      type: 'distributed',
      coordinateSystem: 'global',
      lengthBasis: 'real',
      start: 0,
      end: 1,
      qxStart: 0,
      qxEnd: 0,
      qyStart: -20,
      qyEnd: -20,
    },
  ],
  settings: {
    units: 'kN-m',
    language: 'es',
    gridSize: 1,
    snap: true,
    showGrid: true,
    showNodeLabels: true,
    showMemberLabels: false,
    showLocalAxes: false,
    showLoads: true,
    showDimensions: true,
    showResultValues: true,
    diagramScale: 1,
    deformedScale: 50,
    diagramSide: 'positive',
  },
};

const resultado = analyzeProject(proyecto);

await servidor.close();

if (!resultado.success) {
  console.error('El motor no resolvió la escena:');
  for (const issue of resultado.issues) console.error(` - [${issue.severity}] ${issue.message}`);
  process.exit(1);
}

/** Reduce una curva a `n` puntos equiespaciados en x, conservando los extremos. */
const remuestrear = (puntos, n) => {
  if (puntos.length <= n) return puntos;
  const paso = (puntos.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, k) => puntos[Math.round(k * paso)]);
};

const redondear = (valor, decimales = 6) => Number(valor.toFixed(decimales));

const escena = {
  // Trazabilidad: quién generó esto y con qué modelo, para poder rehacerlo.
  generadoPor: 'video/scripts/generar-escena.mjs',
  motor: 'src/engine/solver.ts · analyzeProject',
  modelo: {
    descripcion: 'Pórtico de un vano, 6 m × 4 m, columnas empotradas',
    E,
    A,
    I,
    cargas: { distribuidaViga: -20, horizontalNudo: 30, unidades: 'kN/m y kN' },
  },
  nodos: proyecto.nodes.map(({ id, x, y, support }) => ({ id, x, y, apoyo: support.type })),
  barras: proyecto.members.map(({ id, i, j }) => ({ id, i, j })),
  resultadosNodales: resultado.nodeResults.map((n) => ({
    id: n.nodeId,
    ux: redondear(n.ux),
    uy: redondear(n.uy),
    rz: redondear(n.rz),
    rx: redondear(n.rx, 4),
    ry: redondear(n.ry, 4),
    rm: redondear(n.rm, 4),
  })),
  resultadosBarras: resultado.memberResults.map((m) => ({
    id: m.memberId,
    longitud: redondear(m.length, 4),
    maxMomento: redondear(m.maxMoment, 4),
    minMomento: redondear(m.minMoment, 4),
    maxCortante: redondear(m.maxShear, 4),
    minCortante: redondear(m.minShear, 4),
    maxAxial: redondear(m.maxAxial, 4),
    minAxial: redondear(m.minAxial, 4),
    diagrama: remuestrear(m.diagram, 41).map((p) => ({
      x: redondear(p.x, 4),
      n: redondear(p.axial, 4),
      v: redondear(p.shear, 4),
      m: redondear(p.moment, 4),
    })),
    deformada: remuestrear(m.deformation, 41).map((p) => ({
      x: redondear(p.x, 4),
      u: redondear(p.u, 8),
      v: redondear(p.v, 8),
    })),
  })),
  confiabilidad: {
    residuo: redondear(resultado.residualNorm, 12),
    condicion: redondear(resultado.conditionEstimate, 2),
  },
};

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, `${JSON.stringify(escena, null, 2)}\n`);

console.log(`escena-portico.json escrito desde el motor real.`);
console.log(
  `  momento máximo en viga: ${escena.resultadosBarras[1].maxMomento} kN·m · residuo ${escena.confiabilidad.residuo}`,
);
