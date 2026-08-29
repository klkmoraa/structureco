import { describe, expect, it } from 'vitest';
import { createBlankProject, createDefaultProject } from '../../data/defaultProject';
import { buildModelOverview } from './modelOverview';

describe('model overview', () => {
  it('counts the model and uses its nodal envelope without duplicating analysis state', () => {
    const overview = buildModelOverview(createDefaultProject(), 'ULS-1');
    expect(overview).toMatchObject({ empty: false, nodes: 4, members: 3, supports: 2, loads: 3, activeLoadCases: 1, totalLoadCases: 2 });
    expect(overview.extent).toEqual({ width: 6, height: 4 });
  });

  it('gives an empty model an intentional first state instead of a false zero-sized extent', () => {
    const overview = buildModelOverview(createBlankProject(), 'none');
    expect(overview.empty).toBe(true);
    expect(overview.extent).toBeNull();
  });
});
