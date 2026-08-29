import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { applicableMethods, resolveSolutionMethod, SOLUTION_METHODS } from './methodRegistry';

describe('classical method registry', () => {
  it('registers the matrix method and the other eleven procedures', () => {
    expect(SOLUTION_METHODS.map((method) => method.id)).toEqual([
      'matrix-stiffness', 'double-integration', 'conjugate-beam', 'three-moment', 'hardy-cross',
      'virtual-work', 'method-of-sections', 'method-of-joints', 'portal-method', 'cantilever-method',
      'castigliano-truss', 'kani-frame',
    ]);
  });

  it('keeps only applicable choices and falls back to matrix stiffness after a model changes domain', () => {
    const frame = createDefaultProject();
    frame.settings.solutionMethod = 'double-integration';

    expect(applicableMethods(frame).map((method) => method.id)).toEqual(expect.arrayContaining([
      'matrix-stiffness', 'portal-method', 'cantilever-method', 'kani-frame',
    ]));
    expect(resolveSolutionMethod(frame)).toBe('matrix-stiffness');
  });
});
