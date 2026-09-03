/**
 * Cargas de barra, liberaciones, muelles, asientos y cortante en Space 3D,
 * contrastados contra soluciones cerradas de manual.
 *
 * Los voladizos y las vigas de un vano viven sobre el eje global X con la
 * referencia `[0, 1, 0]`, de modo que la triada local coincide con la global y
 * las fórmulas del manual se comparan sin transformar ejes.
 */
import { describe, expect, it } from 'vitest';
import { analyzeSpace3DProject } from './solver';
import {
  bendingCantilever,
  simpleBeam,
  uniformMemberLoad,
  unloadedCantilever,
} from './fixtures';
import { fixedSpace3DRestraints, noSpace3DSprings, type Space3DMemberLoad, type Space3DProject } from '../model/types';

const L = 2;
const E = 200_000_000;
const Iz = 8e-5;
const Iy = 3e-5;
const G = 80_000_000;

const analyze = (project: Space3DProject) => {
  const result = analyzeSpace3DProject(project, 'LC1');
  expect(result.issues).toEqual([]);
  expect(result.success).toBe(true);
  return result;
};

const nodeResult = (result: ReturnType<typeof analyze>, id: string) =>
  result.nodeResults.find((item) => item.nodeId === id)!;

const memberResult = (result: ReturnType<typeof analyze>) => result.memberResults[0];

const stationAt = (result: ReturnType<typeof analyze>, position: number) => {
  const stations = memberResult(result).stations;
  return stations.reduce((best, station) =>
    Math.abs(station.position - position) < Math.abs(best.position - position) ? station : best);
};

const fixedFixedBeam = (loads: readonly Space3DMemberLoad[]): Space3DProject => {
  const base = unloadedCantilever({ L });
  return {
    ...base,
    nodes: base.nodes.map((node) => ({ ...node, restraints: fixedSpace3DRestraints(), springs: noSpace3DSprings() })),
    memberLoads: [...loads],
  };
};

describe('cargas repartidas sobre barra', () => {
  it('reproduce el voladizo con carga uniforme', () => {
    const w = 12;
    const result = analyze({ ...unloadedCantilever({ L }), memberLoads: [uniformMemberLoad([0, w, 0])] });

    // Flecha de manual: w·L⁴ / (8·E·I).
    expect(nodeResult(result, 'J').displacement.uy).toBeCloseTo(w * L ** 4 / (8 * E * Iz), 12);
    // Reacción vertical y momento de empotramiento.
    expect(nodeResult(result, 'I').reaction.uy).toBeCloseTo(-w * L, 8);
    expect(stationAt(result, 0).Mz).toBeCloseTo(w * L ** 2 / 2, 8);
    expect(stationAt(result, 0).Vy).toBeCloseTo(-w * L, 8);
    // Extremo libre: todas las acciones se anulan.
    expect(stationAt(result, 1).Mz).toBeCloseTo(0, 8);
    expect(stationAt(result, 1).Vy).toBeCloseTo(0, 8);
  });

  it('da los momentos de empotramiento perfecto de la viga biempotrada', () => {
    const w = -9;
    const result = analyze(fixedFixedBeam([uniformMemberLoad([0, w, 0])]));

    // Sin giro ni desplazamiento, las acciones de extremo son las de la tabla.
    expect(stationAt(result, 0).Mz).toBeCloseTo(w * L ** 2 / 12, 8);
    expect(stationAt(result, 0.5).Mz).toBeCloseTo(-w * L ** 2 / 24, 8);
    expect(stationAt(result, 0).Vy).toBeCloseTo(-w * L / 2, 8);
    expect(nodeResult(result, 'I').reaction.uy).toBeCloseTo(-w * L / 2, 8);
  });

  it('reparte igual en el plano x–z, con el signo del par invertido', () => {
    const w = 12;
    const result = analyze({ ...unloadedCantilever({ L }), memberLoads: [uniformMemberLoad([0, 0, w])] });

    expect(nodeResult(result, 'J').displacement.uz).toBeCloseTo(w * L ** 4 / (8 * E * Iy), 12);
    expect(stationAt(result, 0).My).toBeCloseTo(-w * L ** 2 / 2, 8);
    expect(stationAt(result, 0).Vz).toBeCloseTo(-w * L, 8);
    expect(stationAt(result, 1).My).toBeCloseTo(0, 8);
  });

  it('trata una repartida global igual que la local cuando los ejes coinciden', () => {
    const w = -7;
    const local = analyze({ ...unloadedCantilever({ L }), memberLoads: [uniformMemberLoad([0, w, 0], 'local')] });
    const global = analyze({ ...unloadedCantilever({ L }), memberLoads: [uniformMemberLoad([0, w, 0], 'global')] });

    expect(global.nodeResults[1].displacement.uy).toBeCloseTo(local.nodeResults[1].displacement.uy, 14);
  });

  it('acumula una repartida trapecial con la resultante correcta', () => {
    const project: Space3DProject = {
      ...unloadedCantilever({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'distributed', axes: 'local',
        start: 0, end: 1, startValue: [0, 0, 0], endValue: [0, -10, 0],
      }],
    };
    const result = analyze(project);
    // Triangular creciente hacia el extremo libre: resultante q·L/2 con
    // centro de gravedad a 2L/3 del empotramiento.
    expect(nodeResult(result, 'I').reaction.uy).toBeCloseTo(10 * L / 2, 8);
    expect(stationAt(result, 0).Mz).toBeCloseTo(-10 * L ** 2 / 3, 6);
  });

  it('respeta el tramo parcial de una repartida', () => {
    const project: Space3DProject = {
      ...unloadedCantilever({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'distributed', axes: 'local',
        start: 0.5, end: 1, startValue: [0, -8, 0], endValue: [0, -8, 0],
      }],
    };
    const result = analyze(project);
    expect(nodeResult(result, 'I').reaction.uy).toBeCloseTo(8 * L / 2, 8);
    // Antes del tramo cargado el cortante es constante e igual a la reacción.
    const quarter = stationAt(result, 0.25);
    expect(quarter.Vy).toBeCloseTo(8 * L / 2, 8);
  });
});

describe('acciones puntuales sobre barra', () => {
  it('coincide con la carga nodal equivalente aplicada en el extremo', () => {
    const P = 10;
    const nodal = analyze(bendingCantilever({ L, P, axis: 'y' }));
    const onMember = analyze({
      ...unloadedCantilever({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local',
        start: 1, end: 1, startValue: [0, P, 0], endValue: [0, 0, 0],
      }],
    });

    expect(onMember.nodeResults[1].displacement.uy).toBeCloseTo(nodal.nodeResults[1].displacement.uy, 12);
    expect(onMember.nodeResults[0].reaction.uy).toBeCloseTo(nodal.nodeResults[0].reaction.uy, 8);
  });

  it('produce el momento de manual de la viga biapoyada con carga centrada', () => {
    const P = -20;
    const result = analyze({
      ...simpleBeam({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local',
        start: 0.5, end: 0.5, startValue: [0, P, 0], endValue: [0, 0, 0],
      }],
    });

    expect(nodeResult(result, 'I').reaction.uy).toBeCloseTo(-P / 2, 8);
    expect(stationAt(result, 0.5).Mz).toBeCloseTo(-P * L / 4, 8);
  });

  it('dibuja el salto del cortante como salto y no como rampa', () => {
    const P = -20;
    const result = analyze({
      ...simpleBeam({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local',
        start: 0.5, end: 0.5, startValue: [0, P, 0], endValue: [0, 0, 0],
      }],
    });

    const midpoint = memberResult(result).stations.filter((station) => Math.abs(station.position - 0.5) < 1e-9);
    expect(midpoint).toHaveLength(2);
    expect(midpoint[1].Vy - midpoint[0].Vy).toBeCloseTo(P, 8);
  });

  it('aplica un momento puntual con su salto en el diagrama', () => {
    const M = 15;
    const result = analyze({
      ...simpleBeam({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'moment', axes: 'local',
        start: 0.5, end: 0.5, startValue: [0, 0, M], endValue: [0, 0, 0],
      }],
    });

    const midpoint = memberResult(result).stations.filter((station) => Math.abs(station.position - 0.5) < 1e-9);
    expect(midpoint).toHaveLength(2);
    expect(midpoint[1].Mz - midpoint[0].Mz).toBeCloseTo(-M, 8);
  });
});

describe('cierre del diagrama', () => {
  it('empalma con las acciones del extremo j en todas las componentes', () => {
    const project: Space3DProject = {
      ...unloadedCantilever({ L }),
      memberLoads: [
        { id: 'A', caseId: 'LC1', memberId: 'M1', kind: 'distributed', axes: 'local', start: 0.1, end: 0.9, startValue: [3, -7, 4], endValue: [1, -2, -5] },
        { id: 'B', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local', start: 0.35, end: 0.35, startValue: [2, -9, 6], endValue: [0, 0, 0] },
        { id: 'C', caseId: 'LC1', memberId: 'M1', kind: 'moment', axes: 'local', start: 0.7, end: 0.7, startValue: [4, -3, 5], endValue: [0, 0, 0] },
      ],
    };
    const result = analyze(project);
    const member = memberResult(result);
    const last = member.stations[member.stations.length - 1];

    expect(last.N).toBeCloseTo(member.end.N, 7);
    expect(last.T).toBeCloseTo(member.end.T, 7);
    expect(last.Vy).toBeCloseTo(-member.end.Vy, 7);
    expect(last.Vz).toBeCloseTo(-member.end.Vz, 7);
    expect(last.My).toBeCloseTo(member.end.My, 7);
    expect(last.Mz).toBeCloseTo(member.end.Mz, 7);
  });

  it('cierra también con una acción puntual justo en el extremo j', () => {
    const P = -14;
    const result = analyze({
      ...unloadedCantilever({ L }),
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local',
        start: 1, end: 1, startValue: [0, P, 0], endValue: [0, 0, 0],
      }],
    });
    const member = memberResult(result);
    const stations = member.stations;
    const last = stations[stations.length - 1];

    // La estación se duplica en `L`: antes de la carga el vano está descargado,
    // después la lectura empalma con la acción del extremo.
    expect(stations[stations.length - 2].position).toBeCloseTo(1, 12);
    expect(stations[stations.length - 2].Vy).toBeCloseTo(-P, 8);
    expect(last.Vy).toBeCloseTo(-member.end.Vy, 8);
  });

  it('mantiene el equilibrio global con cargas de barra', () => {
    const project: Space3DProject = {
      ...unloadedCantilever({ L }),
      memberLoads: [
        { id: 'A', caseId: 'LC1', memberId: 'M1', kind: 'distributed', axes: 'global', start: 0, end: 1, startValue: [2, -6, 3], endValue: [2, -6, 3] },
        { id: 'B', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'global', start: 0.6, end: 0.6, startValue: [-4, -8, 1], endValue: [0, 0, 0] },
      ],
    };
    const result = analyze(project);
    expect(result.diagnostics.equilibrium.normalized).toBeLessThan(1e-9);
  });
});

describe('peso propio', () => {
  it('equivale a una repartida global explícita', () => {
    const density = 7850;
    const A = 0.01;
    const intensity = density * A * 9.80665 / 1000;
    const base = unloadedCantilever({ L, A });

    const withWeight = analyze({
      ...base,
      members: base.members.map((member) => ({ ...member, density })),
      loadCases: [{ id: 'LC1', name: 'LC1', selfWeightFactor: 1 }],
    });
    const explicit = analyze({
      ...base,
      memberLoads: [uniformMemberLoad([0, -intensity, 0], 'global')],
    });

    expect(withWeight.nodeResults[1].displacement.uy).toBeCloseTo(explicit.nodeResults[1].displacement.uy, 14);
  });

  it('escala con el factor del caso y con el de la combinación', () => {
    const base = unloadedCantilever({ L });
    const project: Space3DProject = {
      ...base,
      members: base.members.map((member) => ({ ...member, density: 7850 })),
      loadCases: [{ id: 'LC1', name: 'LC1', selfWeightFactor: 1 }],
      loadCombinations: [{ id: 'CO1', name: 'CO1', terms: [{ caseId: 'LC1', factor: 1.35 }] }],
    };

    const single = analyzeSpace3DProject(project, 'LC1');
    const factored = analyzeSpace3DProject(project, 'CO1');
    expect(factored.nodeResults[1].displacement.uy).toBeCloseTo(single.nodeResults[1].displacement.uy * 1.35, 14);
  });
});

describe('liberaciones de extremo', () => {
  it('convierte una biempotrada en biapoyada al liberar los dos flectores', () => {
    const w = -9;
    const released = fixedFixedBeam([uniformMemberLoad([0, w, 0])]);
    const result = analyze({
      ...released,
      members: released.members.map((member) => ({
        ...member,
        releases: { ...member.releases, iMz: true, jMz: true },
      })),
    });

    expect(stationAt(result, 0).Mz).toBeCloseTo(0, 8);
    expect(stationAt(result, 0.5).Mz).toBeCloseTo(-w * L ** 2 / 8, 8);
    expect(memberResult(result).start.Mz).toBeCloseTo(0, 8);
    expect(memberResult(result).end.Mz).toBeCloseTo(0, 8);
  });

  it('anula el axil transmitido al liberarlo en un extremo', () => {
    const project = fixedFixedBeam([]);
    const result = analyze({
      ...project,
      nodalLoads: [],
      memberLoads: [{
        id: 'ML1', caseId: 'LC1', memberId: 'M1', kind: 'force', axes: 'local',
        start: 0.5, end: 0.5, startValue: [0, -10, 0], endValue: [0, 0, 0],
      }],
      members: project.members.map((member) => ({ ...member, releases: { ...member.releases, jN: true } })),
    });

    expect(memberResult(result).end.N).toBeCloseTo(0, 9);
  });

  it('rechaza liberar la misma acción en los dos extremos', () => {
    const project = fixedFixedBeam([]);
    const result = analyzeSpace3DProject({
      ...project,
      members: project.members.map((member) => ({ ...member, releases: { ...member.releases, iN: true, jN: true } })),
    }, 'LC1');

    expect(result.success).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('invalid-release');
  });
});

describe('muelles de apoyo', () => {
  it('suma la flexibilidad del muelle a la de la barra', () => {
    const P = -10;
    const k = 500;
    const base = bendingCantilever({ L, P, axis: 'y' });
    const rigid = analyze(base);
    const sprung = analyze({
      ...base,
      nodes: base.nodes.map((node) => (node.id === 'I'
        ? { ...node, restraints: { ...node.restraints, uy: false }, springs: { ...noSpace3DSprings(), uy: k } }
        : node)),
    });

    // El apoyo baja P/k y el voladizo sigue flectando lo mismo.
    expect(sprung.nodeResults[0].displacement.uy).toBeCloseTo(P / k, 10);
    expect(sprung.nodeResults[1].displacement.uy - sprung.nodeResults[0].displacement.uy)
      .toBeCloseTo(rigid.nodeResults[1].displacement.uy, 9);
  });

  it('publica la fuerza del muelle como reacción', () => {
    const P = -10;
    const k = 500;
    const base = bendingCantilever({ L, P, axis: 'y' });
    const result = analyze({
      ...base,
      nodes: base.nodes.map((node) => (node.id === 'I'
        ? { ...node, restraints: { ...node.restraints, uy: false }, springs: { ...noSpace3DSprings(), uy: k } }
        : node)),
    });

    expect(result.nodeResults[0].reaction.uy).toBeCloseTo(-P, 8);
    expect(result.diagnostics.equilibrium.normalized).toBeLessThan(1e-9);
  });

  it('ignora el muelle cuando el grado ya está restringido', () => {
    const base = bendingCantilever({ L, P: -10, axis: 'y' });
    const withSpring = analyze({
      ...base,
      nodes: base.nodes.map((node) => (node.id === 'I' ? { ...node, springs: { ...noSpace3DSprings(), uy: 5 } } : node)),
    });
    const without = analyze(base);
    expect(withSpring.nodeResults[1].displacement.uy).toBeCloseTo(without.nodeResults[1].displacement.uy, 14);
  });
});

describe('asientos de apoyo', () => {
  it('impone el movimiento en el grado restringido', () => {
    const base = unloadedCantilever({ L });
    const result = analyze({
      ...base,
      settlements: [{ id: 'S1', caseId: 'LC1', nodeId: 'I', ux: 0, uy: -0.01, uz: 0, rx: 0, ry: 0, rz: 0 }],
    });

    expect(nodeResult(result, 'I').displacement.uy).toBeCloseTo(-0.01, 14);
    // Un voladizo isostático se mueve como sólido rígido: sin esfuerzos.
    expect(nodeResult(result, 'J').displacement.uy).toBeCloseTo(-0.01, 12);
    expect(memberResult(result).start.Mz).toBeCloseTo(0, 8);
  });

  it('genera esfuerzos en una viga hiperestática', () => {
    const base = fixedFixedBeam([]);
    const delta = -0.005;
    const result = analyze({
      ...base,
      settlements: [{ id: 'S1', caseId: 'LC1', nodeId: 'J', ux: 0, uy: delta, uz: 0, rx: 0, ry: 0, rz: 0 }],
    });

    // Descenso relativo entre empotramientos: |M| = 6·E·I·δ / L², con el
    // arranque en momento negativo porque la barra sale del apoyo hacia abajo.
    expect(stationAt(result, 0).Mz).toBeCloseTo(6 * E * Iz * delta / L ** 2, 6);
    expect(stationAt(result, 1).Mz).toBeCloseTo(-6 * E * Iz * delta / L ** 2, 6);
    expect(result.diagnostics.equilibrium.normalized).toBeLessThan(1e-9);
  });

  it('ignora el asiento sobre un grado libre', () => {
    const base = unloadedCantilever({ L });
    const moved = analyze({
      ...base,
      memberLoads: [uniformMemberLoad([0, -5, 0])],
      settlements: [{ id: 'S1', caseId: 'LC1', nodeId: 'J', ux: 0, uy: -0.02, uz: 0, rx: 0, ry: 0, rz: 0 }],
    });
    const plain = analyze({ ...base, memberLoads: [uniformMemberLoad([0, -5, 0])] });
    expect(moved.nodeResults[1].displacement.uy).toBeCloseTo(plain.nodeResults[1].displacement.uy, 14);
  });
});

describe('deformación por cortante', () => {
  it('añade el término de Timoshenko a la flecha del voladizo', () => {
    const P = 10;
    const shearArea = 0.004;
    const base = bendingCantilever({ L, P, axis: 'y' });
    const result = analyze({
      ...base,
      members: base.members.map((member) => ({ ...member, shearAreaY: shearArea })),
    });

    const expected = P * L ** 3 / (3 * E * Iz) + P * L / (G * shearArea);
    expect(result.nodeResults[1].displacement.uy).toBeCloseTo(expected, 12);
  });

  it('no cambia nada cuando el área de cortante es cero', () => {
    const base = bendingCantilever({ L, P: 10, axis: 'y' });
    const result = analyze(base);
    expect(result.nodeResults[1].displacement.uy).toBeCloseTo(10 * L ** 3 / (3 * E * Iz), 12);
  });

  it('deja intactos los momentos de empotramiento de una carga uniforme', () => {
    const w = -9;
    const project = fixedFixedBeam([uniformMemberLoad([0, w, 0])]);
    const result = analyze({
      ...project,
      members: project.members.map((member) => ({ ...member, shearAreaY: 0.004 })),
    });
    expect(stationAt(result, 0).Mz).toBeCloseTo(w * L ** 2 / 12, 8);
  });
});
