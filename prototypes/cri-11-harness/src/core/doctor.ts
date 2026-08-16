/**
 * Model Doctor · hallazgos SIMULADOS, deterministas sobre el modelo efectivo.
 *
 * CRI-11 §8 pide un flujo representativo: finding → localizar → entender →
 * actuar/cerrar, con el objeto y la evidencia sincronizados — y advierte
 * explícitamente **no elevar un hallazgo visual a dictamen de seguridad**.
 *
 * Por eso cada hallazgo de aquí:
 *   · nace de una regla de MODELADO comprobable en los datos del fixture
 *     (un nudo sin apoyo ni carga, un miembro sin sección asignada, un nudo
 *     que quedó sin ningún miembro tras borrar), nunca de un juicio sobre si
 *     la estructura resiste;
 *   · usa lenguaje de «revisión de modelado», no de seguridad estructural;
 *   · no inventa una verificación normativa que StructureCo no hace.
 */

import type { EffectiveModel } from './model';

export type FindingSeverity = 'info' | 'notice' | 'attention';
export type FindingKind = 'unsupported-node' | 'isolated-node' | 'zero-length' | 'duplicate-load' | 'slender-member';

export interface Finding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  objectId: string;
  objectKind: 'node' | 'member';
  /** Clave de traducción del título y del cuerpo, resueltas en el componente. */
  titleKey: string;
  bodyKey: string;
  /** Datos que el cuerpo necesita interpolar (id, longitud, etc.), no prosa. */
  data: Record<string, string | number>;
}

const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));

/**
 * Deriva los hallazgos del modelo efectivo. Es una función pura: mismo modelo,
 * mismos hallazgos, mismo orden — así que localizar un hallazgo y volver a
 * calcularlos no puede desincronizar la lista de la que el usuario partió.
 */
export const deriveFindings = (model: EffectiveModel): Finding[] => {
  const findings: Finding[] = [];
  const memberCountByNode = new Map<string, number>();
  for (const member of model.members) {
    memberCountByNode.set(member.i, (memberCountByNode.get(member.i) ?? 0) + 1);
    memberCountByNode.set(member.j, (memberCountByNode.get(member.j) ?? 0) + 1);
  }

  for (const node of model.nodes) {
    const connections = memberCountByNode.get(node.id) ?? 0;
    if (connections === 0) {
      findings.push({
        id: `finding-isolated-${node.id}`,
        kind: 'isolated-node',
        severity: 'attention',
        objectId: node.id,
        objectKind: 'node',
        titleKey: 'doctor.finding.isolated.title',
        bodyKey: 'doctor.finding.isolated.body',
        data: { id: node.id },
      });
    } else if (connections === 1 && node.support === 'none') {
      findings.push({
        id: `finding-unsupported-${node.id}`,
        kind: 'unsupported-node',
        severity: 'notice',
        objectId: node.id,
        objectKind: 'node',
        titleKey: 'doctor.finding.unsupported.title',
        bodyKey: 'doctor.finding.unsupported.body',
        data: { id: node.id },
      });
    }
  }

  for (const member of model.members) {
    const i = model.nodes.find((node) => node.id === member.i);
    const j = model.nodes.find((node) => node.id === member.j);
    if (!i || !j) continue;
    const length = Math.hypot(j.x - i.x, j.y - i.y);
    if (length < 0.05) {
      findings.push({
        id: `finding-zero-${member.id}`,
        kind: 'zero-length',
        severity: 'attention',
        objectId: member.id,
        objectKind: 'member',
        titleKey: 'doctor.finding.zeroLength.title',
        bodyKey: 'doctor.finding.zeroLength.body',
        data: { id: member.id, length: round(length, 3) },
      });
    } else if (length > 9) {
      findings.push({
        id: `finding-slender-${member.id}`,
        kind: 'slender-member',
        severity: 'info',
        objectId: member.id,
        objectKind: 'member',
        titleKey: 'doctor.finding.slender.title',
        bodyKey: 'doctor.finding.slender.body',
        data: { id: member.id, length: round(length, 2) },
      });
    }
  }

  const loadsByTarget = new Map<string, number>();
  for (const load of model.loads) loadsByTarget.set(load.target, (loadsByTarget.get(load.target) ?? 0) + 1);
  for (const [target, count] of loadsByTarget) {
    if (count <= 1) continue;
    const member = model.members.find((m) => m.id === target);
    if (!member) continue;
    findings.push({
      id: `finding-duplicate-${target}`,
      kind: 'duplicate-load',
      severity: 'info',
      objectId: target,
      objectKind: 'member',
      titleKey: 'doctor.finding.duplicateLoad.title',
      bodyKey: 'doctor.finding.duplicateLoad.body',
      data: { id: target, count },
    });
  }

  const order: Record<FindingSeverity, number> = { attention: 0, notice: 1, info: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
};

export const severityCount = (findings: Finding[], severity: FindingSeverity): number =>
  findings.filter((finding) => finding.severity === severity).length;
