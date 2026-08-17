import { describe, expect, it } from 'vitest';
import {
  BROKER_SURFACE_IDS,
  SURFACE_PRESENTATION_TABLE,
  closeSurfaceIntent,
  createSurfaceBrokerState,
  openSurfaceIntent,
  resolveSurfaceActivity,
  resolveSurfacePresentation,
  setSurfaceExtent,
  validateSurfaceCombination,
  type SurfaceId,
  type SurfacePresentation,
} from './surfacePresentation';

const expectedTable: Record<'X2' | 'M1' | 'K0', Record<SurfaceId, SurfacePresentation>> = {
  X2: { detail: 'dock', analysisSetup: 'dock', view: 'dock', results: 'dock', datasheet: 'drawer', doctor: 'drawer', palette: 'overlay', candidatePicker: 'floating', contextualActions: 'inset' },
  M1: { detail: 'inset', analysisSetup: 'inset', view: 'inset', results: 'inset', datasheet: 'drawer', doctor: 'drawer', palette: 'overlay', candidatePicker: 'floating', contextualActions: 'inset' },
  K0: { detail: 'sheet', analysisSetup: 'sheet', view: 'sheet', results: 'sheet', datasheet: 'fullscreen', doctor: 'fullscreen', palette: 'sheet', candidatePicker: 'sheet', contextualActions: 'inset' },
};

describe('surface presentation table', () => {
  it('is the literal X2/M1/K0 matrix for every broker-owned surface', () => {
    expect(BROKER_SURFACE_IDS).toEqual(['detail', 'analysisSetup', 'view', 'results', 'datasheet', 'doctor', 'palette', 'candidatePicker', 'contextualActions']);
    expect(SURFACE_PRESENTATION_TABLE).toEqual(expectedTable);

    for (const shellClass of ['X2', 'M1', 'K0'] as const) {
      for (const surface of BROKER_SURFACE_IDS) {
        expect(resolveSurfacePresentation(shellClass, surface)).toBe(expectedTable[shellClass][surface]);
      }
    }
  });

  it('migrates an open detail surface without changing its logical intent', () => {
    const state = openSurfaceIntent(createSurfaceBrokerState(), 'detail');

    expect(resolveSurfaceActivity('X2', state).detail).toMatchObject({ status: 'active', presentation: 'dock' });
    expect(resolveSurfaceActivity('M1', state).detail).toMatchObject({ status: 'active', presentation: 'inset' });
    expect(resolveSurfaceActivity('K0', state).detail).toMatchObject({ status: 'active', presentation: 'sheet' });
    expect(resolveSurfaceActivity('X2', state).detail).toMatchObject({ status: 'active', presentation: 'dock' });
    expect(state.surfaces.detail.open).toBe(true);
  });
});

describe('surface exclusivity', () => {
  it('keeps only the latest contextual layer active in Compact and resumes the prior layer after close', () => {
    let state = createSurfaceBrokerState(['results']);
    state = openSurfaceIntent(state, 'detail');
    state = openSurfaceIntent(state, 'datasheet');

    const compact = resolveSurfaceActivity('K0', state);
    expect(compact.datasheet.status).toBe('active');
    expect(compact.detail.status).toBe('suspended');
    expect(compact.results.status).toBe('suspended');

    state = closeSurfaceIntent(state, 'datasheet');
    const resumed = resolveSurfaceActivity('K0', state);
    expect(resumed.detail.status).toBe('active');
    expect(resumed.results.status).toBe('suspended');
    expect(state.surfaces.detail.open).toBe(true);
  });

  it('never activates two drawer/fullscreen presentations in any class', () => {
    let state = createSurfaceBrokerState();
    state = openSurfaceIntent(state, 'datasheet');
    state = openSurfaceIntent(state, 'doctor');

    for (const shellClass of ['X2', 'M1', 'K0'] as const) {
      const activity = resolveSurfaceActivity(shellClass, state);
      const activeModal = BROKER_SURFACE_IDS.filter((surface) => (
        activity[surface].status === 'active'
        && ['drawer', 'fullscreen'].includes(activity[surface].presentation)
      ));
      expect(activeModal).toEqual(['doctor']);
      expect(validateSurfaceCombination(shellClass, activity)).toEqual([]);
    }
  });

  it('retains suspended logical state instead of destructively closing it', () => {
    let state = createSurfaceBrokerState();
    state = openSurfaceIntent(state, 'datasheet');
    const datasheetRequest = state.surfaces.datasheet.requestVersion;
    state = openSurfaceIntent(state, 'doctor');

    expect(resolveSurfaceActivity('X2', state).datasheet.status).toBe('suspended');
    expect(state.surfaces.datasheet).toMatchObject({ open: true, requestVersion: datasheetRequest });

    state = closeSurfaceIntent(state, 'doctor');
    expect(resolveSurfaceActivity('X2', state).datasheet.status).toBe('active');
  });

  it('treats the candidate picker as one contextual Compact layer and migrates it without a selection-side effect', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(['detail']), 'candidatePicker');

    expect(resolveSurfaceActivity('K0', state).candidatePicker).toMatchObject({ status: 'active', presentation: 'sheet' });
    expect(resolveSurfaceActivity('K0', state).detail.status).toBe('suspended');
    expect(resolveSurfaceActivity('X2', state).candidatePicker).toMatchObject({ status: 'active', presentation: 'floating' });
    expect(resolveSurfaceActivity('K0', state).candidatePicker.status).toBe('active');
  });

  it('gives the Candidate Picker precedence over contextual-actions in Compact and resumes the derived surface without changing its intent', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(), 'contextualActions');
    state = openSurfaceIntent(state, 'candidatePicker');

    const compact = resolveSurfaceActivity('K0', state);
    expect(compact.candidatePicker).toMatchObject({ status: 'active', presentation: 'sheet' });
    expect(compact.contextualActions).toMatchObject({ status: 'suspended', presentation: 'inset' });

    state = closeSurfaceIntent(state, 'candidatePicker');
    expect(resolveSurfaceActivity('K0', state).contextualActions).toMatchObject({ status: 'active', presentation: 'inset' });
  });
});

describe('peek state', () => {
  it('allows peek only as state of a drawer/fullscreen presentation', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(), 'datasheet');
    state = setSurfaceExtent(state, 'X2', 'datasheet', 'peek');
    expect(resolveSurfaceActivity('X2', state).datasheet.extent).toBe('peek');
    expect(resolveSurfaceActivity('K0', state).datasheet).toMatchObject({ presentation: 'fullscreen', extent: 'peek' });

    const detail = openSurfaceIntent(createSurfaceBrokerState(), 'detail');
    expect(() => setSurfaceExtent(detail, 'K0', 'detail', 'peek')).toThrow(/drawer|fullscreen/i);
  });
});
