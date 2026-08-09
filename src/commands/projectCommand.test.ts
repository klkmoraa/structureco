import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import {
  applyProjectPatch,
  compileProjectCommand,
  invertProjectPatch,
  type ProjectCommand,
} from './projectCommand';

describe('ProjectCommand', () => {
  it('applies and exactly reverses a member creation with a new endpoint', () => {
    const project = createDefaultProject();
    const before = structuredClone(project);
    const source = project.members[0];
    const command: ProjectCommand = {
      kind: 'member.create',
      description: 'Crear miembro M-new',
      nodes: [{ id: 'N-new', x: 10, y: 3, support: { type: 'none' } }],
      member: { ...structuredClone(source), id: 'M-new', i: source.j, j: 'N-new' },
    };

    const compiled = compileProjectCommand(project, command);
    const applied = applyProjectPatch(project, compiled.forward);
    expect(applied.nodes.at(-1)?.id).toBe('N-new');
    expect(applied.members.at(-1)?.id).toBe('M-new');
    expect(applyProjectPatch(applied, compiled.inverse)).toEqual(before);
    expect(project).toEqual(before);
  });

  it('fails atomically when an update precondition no longer matches', () => {
    const project = createDefaultProject();
    const member = project.members[0];
    const compiled = compileProjectCommand(project, {
      kind: 'member.update',
      description: `Editar ${member.id}`,
      memberId: member.id,
      changes: { A: member.A * 2 },
    });
    const stale = structuredClone(project);
    stale.members[0].A *= 3;
    const staleBefore = structuredClone(stale);

    expect(() => applyProjectPatch(stale, compiled.forward)).toThrow(/precondici/i);
    expect(stale).toEqual(staleBefore);
  });

  it('removes dependent member data and restores its canonical order', () => {
    const project = createDefaultProject();
    const member = project.members[0];
    project.memberLoads.push({
      id: 'ML-delete', memberId: member.id, caseId: project.loadCases[0].id,
      type: 'point', coordinateSystem: 'global', lengthBasis: 'real', start: 0, end: 1,
      px: 0, py: -1, position: 0.5,
    });
    project.memberInitialEffects ??= [];
    project.memberInitialEffects.push({
      id: 'IE-delete', memberId: member.id, caseId: project.loadCases[0].id,
      type: 'temperature', alpha: 1.2e-5, deltaT: 20, gradient: 0,
    });
    const before = structuredClone(project);

    const compiled = compileProjectCommand(project, {
      kind: 'member.delete', description: `Eliminar ${member.id}`, memberId: member.id,
    });
    const removed = applyProjectPatch(project, compiled.forward);
    expect(removed.members.some((item) => item.id === member.id)).toBe(false);
    expect(removed.memberLoads.some((item) => item.memberId === member.id)).toBe(false);
    expect(applyProjectPatch(removed, invertProjectPatch(compiled.forward))).toEqual(before);
  });

  it('prepares duplication with fresh ids and an exact inverse', () => {
    const project = createDefaultProject();
    const selection = { kind: 'member' as const, id: project.members[0].id };
    const compiled = compileProjectCommand(project, {
      kind: 'selection.duplicate', description: 'Duplicar selección', selection, offset: { x: 2, y: -1 },
    });
    const duplicated = applyProjectPatch(project, compiled.forward);
    expect(duplicated.members).toHaveLength(project.members.length + 1);
    expect(new Set(duplicated.members.map((member) => member.id)).size).toBe(duplicated.members.length);
    expect(applyProjectPatch(duplicated, compiled.inverse)).toEqual(project);
  });
});
