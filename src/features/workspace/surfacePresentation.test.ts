import { describe, expect, it } from 'vitest';
import {
  BROKER_SURFACE_IDS,
  SURFACE_ACTIVITY_CLASS,
  SURFACE_PRESENTATION_TABLE,
  closeSurfaceIntent,
  createSurfaceBrokerState,
  openSurfaceIntent,
  resolveSurfaceActivity,
  resolveSurfacePresentation,
  setSurfaceExtent,
  surfaceActivityClass,
  validateSurfaceCombination,
  type SurfaceActivityClass,
  type SurfaceId,
  type SurfacePresentation,
} from './surfacePresentation';

const expectedTable: Record<'X2' | 'M1' | 'K0', Record<SurfaceId, SurfacePresentation>> = {
  X2: { detail: 'dock', analysisSetup: 'dock', view: 'dock', results: 'dock', generator: 'floating', dense: 'drawer', datasheet: 'drawer', bom: 'drawer', comparison: 'drawer', doctor: 'drawer', palette: 'overlay', candidatePicker: 'floating' },
  M1: { detail: 'inset', analysisSetup: 'inset', view: 'inset', results: 'inset', generator: 'inset', dense: 'drawer', datasheet: 'drawer', bom: 'drawer', comparison: 'drawer', doctor: 'drawer', palette: 'overlay', candidatePicker: 'floating' },
  K0: { detail: 'sheet', analysisSetup: 'sheet', view: 'sheet', results: 'sheet', generator: 'sheet', dense: 'fullscreen', datasheet: 'fullscreen', bom: 'fullscreen', comparison: 'fullscreen', doctor: 'fullscreen', palette: 'sheet', candidatePicker: 'sheet' },
};

describe('surface presentation table', () => {
  it('is the literal X2/M1/K0 matrix for every broker-owned surface', () => {
    expect(BROKER_SURFACE_IDS).toEqual(['detail', 'analysisSetup', 'view', 'results', 'generator', 'dense', 'datasheet', 'bom', 'comparison', 'doctor', 'palette', 'candidatePicker']);
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

  it('lets Generator coexist in X2, replace the M1 inset and own the K0 sheet until it closes', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(['detail']), 'generator');

    expect(resolveSurfaceActivity('X2', state)).toMatchObject({
      detail: { status: 'active', presentation: 'dock' },
      generator: { status: 'active', presentation: 'floating' },
    });
    expect(resolveSurfaceActivity('M1', state)).toMatchObject({
      detail: { status: 'suspended', presentation: 'inset' },
      generator: { status: 'active', presentation: 'inset' },
    });
    expect(resolveSurfaceActivity('K0', state)).toMatchObject({
      detail: { status: 'suspended', presentation: 'sheet' },
      generator: { status: 'active', presentation: 'sheet' },
    });

    state = closeSurfaceIntent(state, 'generator');
    expect(resolveSurfaceActivity('M1', state).detail.status).toBe('active');
    expect(resolveSurfaceActivity('K0', state).detail.status).toBe('active');
  });

  it('treats the candidate picker as one contextual Compact layer and migrates it without a selection-side effect', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(['detail']), 'candidatePicker');

    expect(resolveSurfaceActivity('K0', state).candidatePicker).toMatchObject({ status: 'active', presentation: 'sheet' });
    expect(resolveSurfaceActivity('K0', state).detail.status).toBe('suspended');
    expect(resolveSurfaceActivity('X2', state).candidatePicker).toMatchObject({ status: 'active', presentation: 'floating' });
    expect(resolveSurfaceActivity('K0', state).candidatePicker.status).toBe('active');
  });

});

// ---------------------------------------------------------------------------
// CRI-108 — la actividad se resuelve por rol de superficie, no por una lista
// de componentes. Compact conserva una sola capa contextual activa.
// ---------------------------------------------------------------------------
describe('activity classes', () => {
  it('declares one explicit activity class per broker surface', () => {
    const expected: Record<SurfaceId, SurfaceActivityClass> = {
      detail: 'layer',
      analysisSetup: 'layer',
      view: 'layer',
      results: 'layer',
      generator: 'tool',
      dense: 'tool',
      datasheet: 'tool',
      bom: 'tool',
      comparison: 'tool',
      doctor: 'tool',
      palette: 'layer',
      candidatePicker: 'layer',
    };
    expect(SURFACE_ACTIVITY_CLASS).toEqual(expected);
    for (const surface of BROKER_SURFACE_IDS) expect(surfaceActivityClass(surface)).toBe(expected[surface]);
  });

  it('presents the BOM as one broker-owned tool: drawer in X2/M1 and fullscreen in K0', () => {
    const state = openSurfaceIntent(createSurfaceBrokerState(), 'bom');
    expect(resolveSurfaceActivity('X2', state).bom).toMatchObject({ status: 'active', presentation: 'drawer' });
    expect(resolveSurfaceActivity('M1', state).bom).toMatchObject({ status: 'active', presentation: 'drawer' });
    expect(resolveSurfaceActivity('K0', state).bom).toMatchObject({ status: 'active', presentation: 'fullscreen' });
  });

  it('presents revision comparison as one broker-owned tool: drawer in X2/M1 and fullscreen in K0', () => {
    const state = openSurfaceIntent(createSurfaceBrokerState(), 'comparison');
    expect(resolveSurfaceActivity('X2', state).comparison).toMatchObject({ status: 'active', presentation: 'drawer' });
    expect(resolveSurfaceActivity('M1', state).comparison).toMatchObject({ status: 'active', presentation: 'drawer' });
    expect(resolveSurfaceActivity('K0', state).comparison).toMatchObject({ status: 'active', presentation: 'fullscreen' });
  });

  it('K0 · una capa contextual sí desbanca al Datasheet: la precedencia es por rol, no una excepción para el Datasheet', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(), 'datasheet');
    state = openSurfaceIntent(state, 'detail');

    const activity = resolveSurfaceActivity('K0', state);
    expect(activity.detail.status).toBe('active');
    expect(activity.datasheet).toMatchObject({ open: true, status: 'suspended' });
  });

  it('K0 · el Model Doctor tiene el mismo ciclo de peek que el Datasheet, por ser el mismo rol', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(), 'doctor');
    expect(resolveSurfaceActivity('K0', state).doctor).toMatchObject({ status: 'active', extent: 'default', presentation: 'fullscreen' });

    state = setSurfaceExtent(state, 'K0', 'doctor', 'peek');
    const peeked = resolveSurfaceActivity('K0', state);
    expect(peeked.doctor).toMatchObject({ status: 'active', extent: 'peek', presentation: 'fullscreen' });
    expect(validateSurfaceCombination('K0', peeked)).toEqual([]);

    state = setSurfaceExtent(state, 'K0', 'doctor', 'default');
    expect(resolveSurfaceActivity('K0', state).doctor).toMatchObject({ status: 'active', extent: 'default' });
  });

  it('X2 y M1 no cambian: la ranura única es sólo de Compact', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(['results', 'detail']), 'datasheet');

    for (const shellClass of ['X2', 'M1'] as const) {
      const activity = resolveSurfaceActivity(shellClass, state);
      // Los carriles residentes conviven con la herramienta modal.
      expect(activity.datasheet).toMatchObject({ status: 'active', presentation: 'drawer' });
      expect(activity.detail.status).toBe('active');
      expect(activity.results.status).toBe('active');
      expect(validateSurfaceCombination(shellClass, activity)).toEqual([]);
    }

    // Y `peek` sigue sin alterar a nadie en X2/M1.
    const peeking = setSurfaceExtent(state, 'X2', 'datasheet', 'peek');
    const activity = resolveSurfaceActivity('X2', peeking);
    expect(activity.datasheet).toMatchObject({ status: 'active', extent: 'peek' });
  });
});

describe('peek state', () => {
  it('admite `peek` sobre la superficie densa en las tres clases, porque es modal en todas', () => {
    // `dense` es invocada, nunca residente: en X2/M1 llega como `drawer` y en
    // K0 como `fullscreen`, así que `peek` es válido en las tres (CRI-101).
    for (const shellClass of ['X2', 'M1', 'K0'] as const) {
      const opened = openSurfaceIntent(createSurfaceBrokerState(), 'dense');
      const peeking = setSurfaceExtent(opened, shellClass, 'dense', 'peek');
      const activity = resolveSurfaceActivity(shellClass, peeking);
      expect(activity.dense).toMatchObject({
        presentation: shellClass === 'K0' ? 'fullscreen' : 'drawer',
        extent: 'peek',
        status: 'active',
      });
      expect(validateSurfaceCombination(shellClass, activity)).toEqual([]);
      // Y no queda abierta al cerrarla: no hay residencia que recordar.
      const closed = resolveSurfaceActivity(shellClass, closeSurfaceIntent(peeking, 'dense'));
      expect(closed.dense).toMatchObject({ status: 'closed', extent: 'default' });
    }
  });

  it('allows peek only as state of a drawer/fullscreen presentation', () => {
    let state = openSurfaceIntent(createSurfaceBrokerState(), 'datasheet');
    state = setSurfaceExtent(state, 'X2', 'datasheet', 'peek');
    expect(resolveSurfaceActivity('X2', state).datasheet.extent).toBe('peek');
    expect(resolveSurfaceActivity('K0', state).datasheet).toMatchObject({ presentation: 'fullscreen', extent: 'peek' });

    const detail = openSurfaceIntent(createSurfaceBrokerState(), 'detail');
    expect(() => setSurfaceExtent(detail, 'K0', 'detail', 'peek')).toThrow(/drawer|fullscreen/i);
  });
});
