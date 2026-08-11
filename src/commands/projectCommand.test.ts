import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import {
  applyProjectPatch,
  compileProjectCommand,
  invertProjectPatch,
  type ProjectCommand,
} from './projectCommand';

describe('ProjectCommand', () => {
  it('applies catalog material and section identity atomically with their numeric properties', () => {
    const project = createDefaultProject();
    const member = project.members[0];
    const material = compileProjectCommand(project, {
      kind: 'member.material.apply',
      description: `Aplicar material a ${member.id}`,
      memberId: member.id,
      materialId: 'steel-a992',
      properties: { E: 200e6, G: 76_923_076.9231, density: 7850 },
    });
    const withMaterial = applyProjectPatch(project, material.forward);
    expect(withMaterial.members[0]).toMatchObject({
      materialId: 'steel-a992', materialOrigin: 'catalog',
      E: 200e6, G: 76_923_076.9231, density: 7850,
    });

    const section = compileProjectCommand(withMaterial, {
      kind: 'member.section.apply',
      description: `Aplicar sección a ${member.id}`,
      memberId: member.id,
      sectionId: 'ipe-300',
      properties: { A: 0.00538, I: 0.0000836 },
    });
    const applied = applyProjectPatch(withMaterial, section.forward);
    expect(applied.members[0]).toMatchObject({
      sectionId: 'ipe-300', sectionOrigin: 'catalog', A: 0.00538, I: 0.0000836,
    });
  });

  it('invalidates catalog identity in the same patch as a manual numeric edit and restores it through undo/redo', () => {
    const project = createDefaultProject();
    const member = project.members[0] as typeof project.members[number] & Record<string, unknown>;
    Object.assign(member, {
      materialId: 'steel-a992', materialOrigin: 'catalog',
      sectionId: 'ipe-300', sectionOrigin: 'catalog',
    });
    const before = structuredClone(project);
    const compiled = compileProjectCommand(project, {
      kind: 'member.update', description: `Editar ${member.id}`, memberId: member.id,
      changes: { E: member.E * 1.01, A: member.A * 1.01 },
    });

    const edited = applyProjectPatch(project, compiled.forward);
    expect(edited.members[0]).toMatchObject({ materialOrigin: 'custom', sectionOrigin: 'custom' });
    expect(edited.members[0]).not.toHaveProperty('materialId');
    expect(edited.members[0]).not.toHaveProperty('sectionId');

    const undone = applyProjectPatch(edited, compiled.inverse);
    expect(undone).toEqual(before);
    const redone = applyProjectPatch(undone, compiled.forward);
    expect(redone).toEqual(edited);
  });

  it('does not recover a catalog identity when preset floats are typed back manually', () => {
    const project = createDefaultProject();
    const member = project.members[0] as typeof project.members[number] & Record<string, unknown>;
    Object.assign(member, { materialId: 'steel-a992', materialOrigin: 'catalog' });
    const invalidated = applyProjectPatch(project, compileProjectCommand(project, {
      kind: 'member.update', description: 'Editar E', memberId: member.id, changes: { E: 210e6 },
    }).forward);
    const restoredFloats = applyProjectPatch(invalidated, compileProjectCommand(invalidated, {
      kind: 'member.update', description: 'Reescribir E', memberId: member.id, changes: { E: 200e6 },
    }).forward);

    expect(restoredFloats.members[0]).toMatchObject({ E: 200e6, materialOrigin: 'custom' });
    expect(restoredFloats.members[0]).not.toHaveProperty('materialId');
  });

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
