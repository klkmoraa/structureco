/**
 * FixtureStore · datos sintéticos deterministas.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ESTO NO ES EL MODELO DE StructureCo NI SUS RESULTADOS.                   │
 * │                                                                          │
 * │ Ni una sola cifra de este archivo sale del solver. No hay ensamblaje de  │
 * │ rigideces, no hay sistema de ecuaciones y no hay análisis. Las tablas de │
 * │ abajo son valores FABRICADOS con la forma que tendría un resultado, para │
 * │ poder probar la EXPERIENCIA de leerlos, localizarlos y perderlos cuando  │
 * │ el modelo cambia.                                                        │
 * │                                                                          │
 * │ Todo lo que este módulo produce viaja marcado `fixture: true` y la UI    │
 * │ está obligada a rotularlo. Ver `analysis.ts` para el contrato de estado. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Lo que sí es real y se conserva a propósito: la terminología, las unidades,
 * los signos y la forma de los identificadores del producto (`src/types.ts`).
 * Nodo, miembro, apoyo, caso de carga, sección, material, N/V/M/deformada.
 * Un prototipo que renombra el dominio no prueba nada sobre el dominio.
 */

export type EntityKind = 'node' | 'member' | 'support' | 'load';
export type SupportKind = 'none' | 'pin' | 'roller' | 'fixed';
export type MemberKind = 'frame' | 'truss';

export interface FixtureNode {
  id: string;
  /** m — misma unidad base interna que `NodeModel` */
  x: number;
  y: number;
  support: SupportKind;
}

export interface FixtureMember {
  id: string;
  i: string;
  j: string;
  type: MemberKind;
  /** Identidad de catálogo. Nunca se infiere por coincidencia de floats. */
  sectionId: string;
  materialId: string;
  label?: string;
}

export interface FixtureLoad {
  id: string;
  kind: 'point' | 'distributed';
  target: string;
  /** kN o kN/m según `kind` */
  magnitude: number;
  caseId: string;
}

export interface FixtureSection {
  id: string;
  name: string;
  /** m⁴ — sólo se usa para ordenar el catálogo y escalar la tabla de fixture. */
  I: number;
  /** m² */
  A: number;
  depthMm: number;
}

export interface FixtureMaterial {
  id: string;
  name: string;
  /** kN/m² */
  E: number;
}

export interface FixtureLoadCase {
  id: string;
  name: string;
  category: 'permanent' | 'variable';
}

export interface Fixture {
  id: ScenarioId;
  name: { es: string; en: string };
  purpose: { es: string; en: string };
  nodes: FixtureNode[];
  members: FixtureMember[];
  loads: FixtureLoad[];
  cases: FixtureLoadCase[];
  /** Extensión del modelo en metros, para encuadrar el lienzo. */
  extent: { minX: number; maxX: number; minY: number; maxY: number };
  entityCount: number;
}

export type ScenarioId = 'portal-basic' | 'dense-selection' | 'datasheet-2000';

// ---------------------------------------------------------------------------
// Catálogos — nombres de catálogo reales por familiaridad, valores de fixture
// ---------------------------------------------------------------------------

export const SECTIONS: FixtureSection[] = [
  { id: 'sec-ipe-200', name: 'IPE 200', I: 1.943e-5, A: 2.85e-3, depthMm: 200 },
  { id: 'sec-ipe-240', name: 'IPE 240', I: 3.892e-5, A: 3.91e-3, depthMm: 240 },
  { id: 'sec-ipe-300', name: 'IPE 300', I: 8.356e-5, A: 5.38e-3, depthMm: 300 },
  { id: 'sec-ipe-360', name: 'IPE 360', I: 1.6266e-4, A: 7.27e-3, depthMm: 360 },
  { id: 'sec-hea-200', name: 'HEA 200', I: 3.692e-5, A: 5.38e-3, depthMm: 190 },
  { id: 'sec-hea-260', name: 'HEA 260', I: 1.0455e-4, A: 8.68e-3, depthMm: 250 },
];

export const MATERIALS: FixtureMaterial[] = [
  { id: 'mat-s275', name: 'Acero S275', E: 2.1e8 },
  { id: 'mat-s355', name: 'Acero S355', E: 2.1e8 },
];

export const sectionById = (id: string): FixtureSection =>
  SECTIONS.find((section) => section.id === id) ?? SECTIONS[2];

export const materialById = (id: string): FixtureMaterial =>
  MATERIALS.find((material) => material.id === id) ?? MATERIALS[0];

// ---------------------------------------------------------------------------
// Generador determinista — mismo escenario, mismos IDs, mismos valores
// ---------------------------------------------------------------------------

/** mulberry32: barato, reproducible y sin dependencias. La semilla es el contrato. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const extentOf = (nodes: FixtureNode[]) => ({
  minX: Math.min(...nodes.map((node) => node.x)),
  maxX: Math.max(...nodes.map((node) => node.x)),
  minY: Math.min(...nodes.map((node) => node.y)),
  maxY: Math.max(...nodes.map((node) => node.y)),
});

const CASES: FixtureLoadCase[] = [
  { id: 'case-cp', name: 'Carga permanente', category: 'permanent' },
  { id: 'case-cv', name: 'Carga variable', category: 'variable' },
];

/** Pórtico de un vano: el escenario del vertical slice. */
const portalBasic = (): Fixture => {
  const nodes: FixtureNode[] = [
    { id: 'N1', x: 0, y: 0, support: 'fixed' },
    { id: 'N2', x: 0, y: 4, support: 'none' },
    { id: 'N3', x: 6, y: 4, support: 'none' },
    { id: 'N4', x: 6, y: 0, support: 'pin' },
  ];
  const members: FixtureMember[] = [
    { id: 'M1', i: 'N1', j: 'N2', type: 'frame', sectionId: 'sec-hea-200', materialId: 'mat-s275', label: 'Columna izquierda' },
    { id: 'M2', i: 'N2', j: 'N3', type: 'frame', sectionId: 'sec-ipe-300', materialId: 'mat-s275', label: 'Dintel' },
    { id: 'M3', i: 'N4', j: 'N3', type: 'frame', sectionId: 'sec-hea-200', materialId: 'mat-s275', label: 'Columna derecha' },
  ];
  const loads: FixtureLoad[] = [
    { id: 'Q1', kind: 'distributed', target: 'M2', magnitude: 18.5, caseId: 'case-cp' },
    { id: 'P1', kind: 'point', target: 'N2', magnitude: 12, caseId: 'case-cv' },
  ];
  return {
    id: 'portal-basic',
    name: { es: 'Pórtico de un vano', en: 'Single-bay portal' },
    purpose: {
      es: 'Escenario del recorrido mínimo: seleccionar, editar, resolver, leer y volver.',
      en: 'Minimal-walkthrough scenario: select, edit, solve, read and return.',
    },
    nodes,
    members,
    loads,
    cases: CASES,
    extent: extentOf(nodes),
    entityCount: nodes.length + members.length + loads.length,
  };
};

/**
 * Mismo pórtico con geometría deliberadamente solapada alrededor de N3.
 * Existe para que Fase B pueda probar el picker de candidatos y el contrato de
 * selección precisa (D-06). En Fase A sólo se navega y se mide.
 */
const denseSelection = (): Fixture => {
  const base = portalBasic();
  const nodes = [...base.nodes];
  const members = [...base.members];
  const random = seeded(11);
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 7) * (index + 1);
    const id = `N${5 + index}`;
    nodes.push({
      id,
      x: 6 - Math.cos(angle) * (0.55 + random() * 0.35),
      y: 4 - Math.sin(angle) * (0.55 + random() * 0.35),
      support: 'none',
    });
    members.push({
      id: `M${4 + index}`,
      i: 'N3',
      j: id,
      type: 'truss',
      sectionId: 'sec-ipe-200',
      materialId: 'mat-s275',
      label: `Diagonal ${index + 1}`,
    });
  }
  return {
    ...base,
    id: 'dense-selection',
    name: { es: 'Nudo con candidatos solapados', en: 'Node with overlapping candidates' },
    purpose: {
      es: 'Siete elementos convergen en N3. Prepara el contrato de selección precisa de Fase B.',
      en: 'Seven elements converge on N3. Sets up the Phase B precision-selection contract.',
    },
    nodes,
    members,
    extent: extentOf(nodes),
    entityCount: nodes.length + members.length + base.loads.length,
  };
};

/**
 * Fixture grande de estrés de UI: retícula de 27×23 vanos → 2 084 entidades
 * (672 nodos + 1 292 miembros + 120 cargas), por encima de las 2 000 que pide
 * el encargo. Es un modelo de carga para la superficie densa, **no una promesa
 * de capacidad del engine** — el engine real no participa en este prototipo.
 */
const datasheet2000 = (): Fixture => {
  const columns = 28;
  const rows = 24;
  const nodes: FixtureNode[] = [];
  const members: FixtureMember[] = [];
  const random = seeded(2000);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      nodes.push({
        id: `N${index + 1}`,
        x: column * 4,
        y: row * 3.5,
        support: row === 0 ? (column % 2 === 0 ? 'fixed' : 'pin') : 'none',
      });
    }
  }

  const sectionCycle = ['sec-ipe-240', 'sec-ipe-300', 'sec-ipe-360', 'sec-hea-260'];
  let memberIndex = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const here = row * columns + column + 1;
      if (column < columns - 1) {
        memberIndex += 1;
        members.push({
          id: `M${memberIndex}`,
          i: `N${here}`,
          j: `N${here + 1}`,
          type: 'frame',
          sectionId: sectionCycle[memberIndex % sectionCycle.length],
          materialId: random() > 0.5 ? 'mat-s275' : 'mat-s355',
          label: `Viga ${row + 1}-${column + 1}`,
        });
      }
      if (row < rows - 1) {
        memberIndex += 1;
        members.push({
          id: `M${memberIndex}`,
          i: `N${here}`,
          j: `N${here + columns}`,
          type: 'frame',
          sectionId: sectionCycle[(memberIndex + 2) % sectionCycle.length],
          materialId: random() > 0.5 ? 'mat-s275' : 'mat-s355',
          label: `Columna ${row + 1}-${column + 1}`,
        });
      }
    }
  }

  const loads: FixtureLoad[] = members
    .filter((member) => member.label?.startsWith('Viga'))
    .slice(0, 120)
    .map((member, index) => ({
      id: `Q${index + 1}`,
      kind: 'distributed' as const,
      target: member.id,
      magnitude: 10 + Math.round(random() * 200) / 10,
      caseId: index % 3 === 0 ? 'case-cv' : 'case-cp',
    }));

  return {
    id: 'datasheet-2000',
    name: { es: 'Retícula de estrés · 2 000+ entidades', en: 'Stress grid · 2,000+ entities' },
    purpose: {
      es: 'Carga de trabajo para medir la superficie densa. No afirma capacidad del engine.',
      en: 'Workload for measuring the dense surface. Claims nothing about engine capacity.',
    },
    nodes,
    members,
    loads,
    cases: CASES,
    extent: extentOf(nodes),
    entityCount: nodes.length + members.length + loads.length,
  };
};

const BUILDERS: Record<ScenarioId, () => Fixture> = {
  'portal-basic': portalBasic,
  'dense-selection': denseSelection,
  'datasheet-2000': datasheet2000,
};

const cache = new Map<ScenarioId, Fixture>();

/** Mismo escenario → mismos IDs y mismos valores en cada corrida. */
export const loadFixture = (id: ScenarioId): Fixture => {
  const cached = cache.get(id);
  if (cached) return cached;
  const built = BUILDERS[id]();
  cache.set(id, built);
  return built;
};

export const SCENARIOS: ScenarioId[] = ['portal-basic', 'dense-selection', 'datasheet-2000'];
