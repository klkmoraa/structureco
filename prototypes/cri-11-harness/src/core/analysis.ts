/**
 * Estado de análisis y evidencia SIMULADA.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ NO HAY SOLVER AQUÍ. `runFixtureAnalysis` no resuelve nada: espera un      │
 * │ tiempo, lee una tabla y devuelve números fabricados. Su único trabajo es  │
 * │ producir la SECUENCIA DE ESTADOS que el usuario vive.                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Lo que sí se respeta al pie de la letra son tres contratos del producto:
 *
 * 1. `success ≠ reliable ≠ safe`. Terminar no es ser fiable, y ser fiable no es
 *    ser seguro. Ninguna cadena de este prototipo puede decir «la estructura es
 *    segura», y el copy de `i18n.ts` está escrito para que no pueda.
 *
 * 2. `stale` es fail-closed por construcción (CRI-9 §6, U-06). La obsolescencia
 *    no es una bandera sobre un resultado vivo: el resultado se DESTRUYE
 *    (`result: null`) y `stale` se deriva de `result === null && hadAnalysis`.
 *    Por eso es estructuralmente imposible pintar evidencia caducada.
 *
 * 3. La causa de fiabilidad vive en un elemento enfocable, nunca en un `title`
 *    ni sólo en hover (D-14).
 */

import { sectionById, type FixtureMember } from './fixtures';
import type { EffectiveModel } from './model';

export type ReliabilityLevel = 'reliable' | 'limited' | 'unreliable' | 'failed';
export type Evidence = 'none' | 'N' | 'V' | 'M' | 'deformed';

/** Estado derivado, nunca escrito a mano. Ver `deriveAnalysisPhase`. */
export type AnalysisPhase = 'ready' | 'calculating' | 'current' | 'stale' | 'limited' | 'unreliable' | 'failed';

export type Connectivity = 'online' | 'offline';
export type Persistence = 'saved' | 'conflict';

/**
 * El eje que el harness expone como una sola lista de siete estados. Tres de
 * ellos no son fases de análisis y se dirigen a su propio dueño: `offline` es
 * conectividad y `recovery` es persistencia. Mezclarlos en la misma variable
 * sería repetir el error de composición que CRI-9 diagnosticó.
 */
export type HarnessStateId = 'current' | 'stale' | 'limited' | 'unreliable' | 'failed' | 'offline' | 'recovery';

export const HARNESS_STATES: HarnessStateId[] = [
  'current',
  'stale',
  'limited',
  'unreliable',
  'failed',
  'offline',
  'recovery',
];

export interface ReliabilityCheck {
  id: string;
  label: { es: string; en: string };
  value: number;
  threshold: number;
  level: ReliabilityLevel;
}

export interface MemberResult {
  memberId: string;
  /** kN */
  axial: { i: number; j: number };
  /** kN */
  shear: { i: number; j: number; max: number; maxAt: number };
  /** kN·m */
  moment: { i: number; j: number; max: number; maxAt: number };
  /** mm */
  deflection: { max: number; maxAt: number };
  /** Muestras normalizadas [0..1] del diagrama, por evidencia. */
  samples: Record<Exclude<Evidence, 'none'>, number[]>;
}

/**
 * Reacción de apoyo. Se deriva del cortante ya fabricado en los extremos de
 * los miembros incidentes — no de una fórmula nueva — para que responda a los
 * mismos cambios (sección, geometría) que el resto de la evidencia, en vez de
 * ser un número aislado sin relación con lo demás.
 */
export interface NodeReaction {
  nodeId: string;
  /** kN */
  rx: number;
  /** kN */
  ry: number;
  /** kN·m — sólo distinto de cero en un apoyo `fixed`. */
  mz: number;
}

export interface FixtureAnalysis {
  /** Marca obligatoria: nada de esto viene del solver. */
  fixture: true;
  /** El cálculo terminó. NO significa fiable, y menos aún seguro. */
  success: boolean;
  level: ReliabilityLevel;
  governing?: ReliabilityCheck;
  checks: ReliabilityCheck[];
  members: Record<string, MemberResult>;
  reactions: NodeReaction[];
  /** Sello del modelo que produjo estos números; si cambia, quedan obsoletos. */
  modelStamp: string;
  computedAt: number;
}

export interface AnalysisState {
  result: FixtureAnalysis | null;
  hadAnalysis: boolean;
  isAnalyzing: boolean;
  connectivity: Connectivity;
  persistence: Persistence;
}

export const initialAnalysisState: AnalysisState = {
  result: null,
  hadAnalysis: false,
  isAnalyzing: false,
  connectivity: 'online',
  persistence: 'saved',
};

/**
 * Derivación única. Nadie más decide la fase: se calcula, igual que la
 * composición. `stale` sale de que el resultado ya no existe.
 */
export const deriveAnalysisPhase = (state: AnalysisState): AnalysisPhase => {
  if (state.isAnalyzing) return 'calculating';
  if (!state.result) return state.hadAnalysis ? 'stale' : 'ready';
  if (!state.result.success) return 'failed';
  if (state.result.level === 'unreliable') return 'unreliable';
  if (state.result.level === 'limited') return 'limited';
  return 'current';
};

/**
 * La regla fail-closed, en una función. Sólo se pinta evidencia sobre el modelo
 * cuando hay un resultado vivo que corresponde al modelo actual.
 *
 * `unreliable` SÍ pinta —los números existen— pero la UI está obligada a
 * acompañarlos de su causa y de la acción siguiente. No pintar sería esconder
 * información que el usuario necesita para decidir; pintarlos sin la causa
 * sería afirmar más de lo que se sabe.
 */
export const canPaintEvidence = (phase: AnalysisPhase): boolean =>
  phase === 'current' || phase === 'limited' || phase === 'unreliable';

// ---------------------------------------------------------------------------
// Evidencia fabricada
// ---------------------------------------------------------------------------

const SHAPES: Record<Exclude<Evidence, 'none'>, (t: number) => number> = {
  // Axial: constante por tramo, con un escalón suave para que se lea como dato.
  N: (t) => 0.62 + 0.08 * Math.cos(Math.PI * t),
  // Cortante: lineal, cruza por el centro.
  V: (t) => 1 - 2 * t,
  // Momento: parábola de carga uniforme.
  M: (t) => 4 * t * (1 - t) - 0.35,
  // Deformada: media onda.
  deformed: (t) => Math.sin(Math.PI * t),
};

const SAMPLE_COUNT = 25;

const samplesFor = (kind: Exclude<Evidence, 'none'>): number[] =>
  Array.from({ length: SAMPLE_COUNT }, (_, index) => SHAPES[kind](index / (SAMPLE_COUNT - 1)));

/**
 * Escala declarada. La sección más rígida se lleva más momento y flecha menos:
 * es la RELACIÓN que el usuario espera ver al cambiar de sección, y es lo único
 * que este prototipo necesita para que el cambio se sienta causal. No es una
 * solución del sistema — es una regla de tres sobre una tabla.
 */
const scaleFor = (member: FixtureMember) => {
  const section = sectionById(member.sectionId);
  const reference = sectionById('sec-ipe-300');
  const stiffness = section.I / reference.I;
  return {
    moment: 0.72 + 0.28 * stiffness,
    deflection: 1 / (0.35 + 0.65 * stiffness),
  };
};

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

const memberLength = (model: EffectiveModel, member: FixtureMember) => {
  const i = model.nodes.find((node) => node.id === member.i);
  const j = model.nodes.find((node) => node.id === member.j);
  if (!i || !j) return 1;
  return Math.hypot(j.x - i.x, j.y - i.y) || 1;
};

export interface FixtureAnalysisOptions {
  /** Fuerza el veredicto de fiabilidad; es un eje del harness, no un cálculo. */
  level?: ReliabilityLevel;
}

/**
 * Construye la evidencia fabricada a partir del modelo EFECTIVO (fixture +
 * ediciones ya combinadas por `deriveModel`). Síncrono: el tiempo lo pone
 * quien llama.
 */
export const buildFixtureAnalysis = (model: EffectiveModel, modelStamp: string, options: FixtureAnalysisOptions = {}): FixtureAnalysis => {
  const level = options.level ?? 'reliable';
  const members: Record<string, MemberResult> = {};

  for (const member of model.members) {
    const scale = scaleFor(member);
    const length = memberLength(model, member);
    const base = 18.5 * length * length * 0.08;
    const isBeam = Math.abs((model.nodes.find((n) => n.id === member.i)?.y ?? 0) - (model.nodes.find((n) => n.id === member.j)?.y ?? 0)) < 0.01;
    const factor = isBeam ? 1 : 0.55;

    members[member.id] = {
      memberId: member.id,
      axial: { i: round(-base * factor * 0.42), j: round(-base * factor * 0.42) },
      shear: {
        i: round(base * factor * 0.9),
        j: round(-base * factor * 0.9),
        max: round(base * factor * 0.9),
        maxAt: 0,
      },
      moment: {
        i: round(-base * factor * scale.moment * 0.62),
        j: round(-base * factor * scale.moment * 0.62),
        max: round(base * factor * scale.moment),
        maxAt: round(length / 2, 2),
      },
      deflection: {
        max: round(base * factor * scale.deflection * 0.42, 1),
        maxAt: round(length / 2, 2),
      },
      samples: { N: samplesFor('N'), V: samplesFor('V'), M: samplesFor('M'), deformed: samplesFor('deformed') },
    };
  }

  const reactions: NodeReaction[] = model.nodes
    .filter((node) => node.support !== 'none')
    .map((node) => {
      const incident = model.members.filter((member) => member.i === node.id || member.j === node.id);
      const ry = incident.reduce((sum, member) => {
        const result = members[member.id];
        if (!result) return sum;
        return sum + Math.abs(member.i === node.id ? result.shear.i : result.shear.j);
      }, 0);
      return {
        nodeId: node.id,
        ry: round(ry),
        rx: round(ry * 0.18),
        mz: node.support === 'fixed' ? round(ry * 0.35) : 0,
      };
    });

  const checks: ReliabilityCheck[] = [
    {
      id: 'condition',
      label: { es: 'Número de condición', en: 'Condition number' },
      value: level === 'reliable' ? 4.2e4 : level === 'limited' ? 8.6e7 : 3.1e11,
      threshold: 1e6,
      level: level === 'reliable' ? 'reliable' : level,
    },
    {
      id: 'equilibrium',
      label: { es: 'Residuo de equilibrio global', en: 'Global equilibrium residual' },
      value: level === 'unreliable' ? 4.8e-3 : 2.1e-11,
      threshold: 1e-8,
      level: level === 'unreliable' ? 'unreliable' : 'reliable',
    },
    {
      id: 'diagram-closure',
      label: { es: 'Cierre de diagramas', en: 'Diagram closure' },
      value: level === 'limited' ? 3.4e-6 : 6.7e-12,
      threshold: 1e-7,
      level: level === 'limited' ? 'limited' : 'reliable',
    },
  ];

  const governing = checks.find((check) => check.level !== 'reliable');

  return {
    fixture: true,
    success: level !== 'failed',
    level,
    governing,
    checks,
    members,
    reactions,
    modelStamp,
    computedAt: Date.now(),
  };
};

/**
 * Duración simulada del cálculo. Existe para que `calculating` sea un estado
 * que el usuario ve, no un parpadeo — y para poder medir el tiempo hasta el
 * primer feedback visible, que es lo que CRI-11 pide instrumentar.
 */
export const FIXTURE_SOLVE_MS = 1400;
