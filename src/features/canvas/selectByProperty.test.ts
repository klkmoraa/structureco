import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { SELECTION_QUERIES, countOf, toSelection } from './selectByProperty';

const query = (id: (typeof SELECTION_QUERIES)[number]['id']) => SELECTION_QUERIES.find((item) => item.id === id)!;

describe('selección por propiedad', () => {
  it('selecciona conjuntos sin modificar el proyecto', () => {
    const project = createDefaultProject();
    const before = JSON.stringify(project);
    const result = query('members.frame').run(project, null);
    expect(result.memberIds).toEqual(project.members.filter((member) => member.type === 'frame').map((member) => member.id));
    expect(toSelection(result)).toEqual({ kind: 'multi', nodeIds: [], memberIds: result.memberIds });
    expect(JSON.stringify(project)).toBe(before);
  });

  it('encuentra miembros similares por catálogo o por propiedades del solver', () => {
    const project = createDefaultProject();
    const target = project.members[0];
    const result = query('members.similar').run(project, { kind: 'member', id: target.id });
    expect(result.memberIds).toContain(target.id);
    expect(countOf(result)).toBeGreaterThan(0);
  });

  it('devuelve null para un conjunto vacío', () => {
    expect(toSelection({ nodeIds: [], memberIds: [] })).toBeNull();
  });
});
