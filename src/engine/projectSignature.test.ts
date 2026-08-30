import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { analysisBinding, analysisSignature, matchesAnalysisBinding } from './projectSignature';

const clone = <T>(value: T): T => structuredClone(value);

describe('analysis signature', () => {
  it('ignores presentation settings and a deep clone of the same model', () => {
    const project = createDefaultProject();
    const reference = analysisSignature(project);

    expect(analysisSignature(clone(project))).toBe(reference);

    const displayOnly = clone(project);
    displayOnly.name = 'Otro nombre';
    displayOnly.settings.units = 'N-mm';
    displayOnly.settings.language = 'en';
    displayOnly.settings.diagramScale = (project.settings.diagramScale ?? 1) * 2;
    expect(analysisSignature(displayOnly)).toBe(reference);
  });

  it('changes for every input the solver reads, including the calculation mode', () => {
    const project = createDefaultProject();
    const reference = analysisSignature(project);

    const movedNode = clone(project);
    movedNode.nodes[0].x += 1;
    expect(analysisSignature(movedNode)).not.toBe(reference);

    const softerMember = clone(project);
    softerMember.members[0].I *= 0.5;
    expect(analysisSignature(softerMember)).not.toBe(reference);

    const classroom = clone(project);
    classroom.settings.calculationMode = project.settings.calculationMode === 'classroom' ? 'complete' : 'classroom';
    expect(analysisSignature(classroom)).not.toBe(reference);
  });

  it('binds a result to the project identity and exact selected combination', () => {
    const project = createDefaultProject();
    const firstCombinationId = project.combinations[0].id;
    const secondCombinationId = project.combinations[1].id;
    const binding = analysisBinding(project, firstCombinationId);

    expect(matchesAnalysisBinding(clone(project), firstCombinationId, binding)).toBe(true);

    const otherProject = clone(project);
    otherProject.id = 'other-project';
    expect(matchesAnalysisBinding(otherProject, firstCombinationId, binding)).toBe(false);
    expect(matchesAnalysisBinding(project, secondCombinationId, binding)).toBe(false);

    const changedCombination = clone(project);
    changedCombination.combinations[0].factors = { ...changedCombination.combinations[0].factors, LC1: 2 };
    expect(matchesAnalysisBinding(changedCombination, firstCombinationId, binding)).toBe(false);
  });
});
