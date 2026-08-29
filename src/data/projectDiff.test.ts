import { describe, expect, it } from 'vitest';
import { createDefaultProject } from './defaultProject';
import { diffProjects } from './projectDiff';

describe('project diff tolerance', () => {
  it('stays exact by default and only suppresses declared floating-point noise', () => {
    const before = createDefaultProject();
    const after = structuredClone(before);
    after.nodes[0] = { ...after.nodes[0], x: after.nodes[0]!.x + 1e-10 };

    expect(diffProjects(before, after).summary.modified).toBe(1);
    expect(diffProjects(before, after, { numericTolerance: 1e-8 }).identical).toBe(true);
  });
});
