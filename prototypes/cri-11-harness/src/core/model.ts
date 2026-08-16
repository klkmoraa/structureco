/**
 * Ediciones del modelo · Fase B.
 *
 * Fase A sólo permitía cambiar la sección de un miembro. CRI-11 §4/§5 pide
 * flujos reales de creación y edición para nodo, miembro, apoyo y carga, con
 * undo/redo — no sólo verlos.
 *
 * `ModelEdits` es un parche inmutable sobre el `Fixture` base: nunca muta el
 * fixture, sólo declara qué cambió. `deriveModel` combina ambos en la lista de
 * nodos/miembros/cargas EFECTIVA que el resto de la app debe leer — nadie más
 * debe leer `fixture.nodes`/`fixture.members` directamente una vez que hay
 * ediciones, o vería datos obsoletos.
 *
 * Sigue siendo fixture: crear un nudo aquí no ensambla nada, no resuelve nada,
 * es una entrada más en un array. El único efecto real es que el resultado
 * anterior deja de corresponder al modelo (ver `analysis.ts`, `stampOfModel`).
 */

import type { Fixture, FixtureLoad, FixtureMember, FixtureNode, SupportKind } from './fixtures';

export interface ModelEdits {
  /** memberId → sectionId. Lo único que editaba Fase A. */
  sectionOverrides: Record<string, string>;
  /** nodeId → tipo de apoyo (MOD-04). */
  supportOverrides: Record<string, SupportKind>;
  /** nodeId → posición movida (CNV-08, con alternativa de campo numérico). */
  positionOverrides: Record<string, { x: number; y: number }>;
  /** Nodos creados con la herramienta `Nodo` (MOD-02). */
  addedNodes: FixtureNode[];
  /** Miembros creados con la herramienta `Miembro` (MOD-03). */
  addedMembers: FixtureMember[];
  /** Cargas puntuales colocadas con la herramienta `Carga` (MOD-05). */
  addedLoads: FixtureLoad[];
  /** IDs borrados — de nodos, miembros o cargas, en el mismo registro (MOD-09). */
  deletedIds: Record<string, true>;
}

export const emptyEdits = (): ModelEdits => ({
  sectionOverrides: {},
  supportOverrides: {},
  positionOverrides: {},
  addedNodes: [],
  addedMembers: [],
  addedLoads: [],
  deletedIds: {},
});

export interface EffectiveModel {
  nodes: FixtureNode[];
  members: FixtureMember[];
  loads: FixtureLoad[];
}

/**
 * Combina fixture + ediciones en la lista efectiva. Borrar un nudo arrastra
 * consigo los miembros que lo referencian y las cargas sobre esos miembros o
 * sobre el propio nudo — es integridad referencial del grafo local del
 * prototipo, no una regla de ingeniería.
 */
export const deriveModel = (fixture: Fixture, edits: ModelEdits): EffectiveModel => {
  const liveNodeIds = new Set<string>();
  const nodes: FixtureNode[] = [];
  for (const node of [...fixture.nodes, ...edits.addedNodes]) {
    if (edits.deletedIds[node.id]) continue;
    const position = edits.positionOverrides[node.id];
    const support = edits.supportOverrides[node.id] ?? node.support;
    nodes.push(position ? { ...node, ...position, support } : support !== node.support ? { ...node, support } : node);
    liveNodeIds.add(node.id);
  }

  const members: FixtureMember[] = [];
  for (const member of [...fixture.members, ...edits.addedMembers]) {
    if (edits.deletedIds[member.id]) continue;
    if (!liveNodeIds.has(member.i) || !liveNodeIds.has(member.j)) continue;
    const sectionId = edits.sectionOverrides[member.id];
    members.push(sectionId ? { ...member, sectionId } : member);
  }
  const liveMemberIds = new Set(members.map((member) => member.id));

  const loads: FixtureLoad[] = [];
  for (const load of [...fixture.loads, ...edits.addedLoads]) {
    if (edits.deletedIds[load.id]) continue;
    const targetsMember = fixture.members.some((m) => m.id === load.target) || edits.addedMembers.some((m) => m.id === load.target);
    if (targetsMember && !liveMemberIds.has(load.target)) continue;
    if (!targetsMember && !liveNodeIds.has(load.target)) continue;
    loads.push(load);
  }

  return { nodes, members, loads };
};

/**
 * Sello del modelo EFECTIVO — no sólo de las secciones. Cualquier edición
 * estructural (crear, mover, borrar, cambiar apoyo) tiene que envejecer el
 * resultado anterior tan seguro como cambiar una sección.
 */
export const modelEditsStamp = (fixtureId: string, edits: ModelEdits): string =>
  [
    fixtureId,
    'sec:' + Object.entries(edits.sectionOverrides).sort().map(([k, v]) => `${k}=${v}`).join(','),
    'sup:' + Object.entries(edits.supportOverrides).sort().map(([k, v]) => `${k}=${v}`).join(','),
    'pos:' + Object.entries(edits.positionOverrides).sort().map(([k, v]) => `${k}=${v.x.toFixed(3)}/${v.y.toFixed(3)}`).join(','),
    'addN:' + edits.addedNodes.map((n) => n.id).sort().join(','),
    'addM:' + edits.addedMembers.map((m) => m.id).sort().join(','),
    'addL:' + edits.addedLoads.map((l) => l.id).sort().join(','),
    'del:' + Object.keys(edits.deletedIds).sort().join(','),
  ].join('|');

let counter = 0;
/** IDs deterministas dentro de una sesión: `N101`, `M101`, `Q101`… nunca chocan con el fixture base. */
export const nextId = (prefix: 'N' | 'M' | 'Q'): string => {
  counter += 1;
  return `${prefix}${100 + counter}`;
};

export const resetIdCounter = (): void => {
  counter = 0;
};
