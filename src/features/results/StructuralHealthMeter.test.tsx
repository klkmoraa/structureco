// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, MemberModel, MemberResult, ProjectModel } from '../../types';
import { FALLBACK_YIELD_STRENGTH, demandTone } from './elasticDemand';

/**
 * Un material que el catálogo no reconoce cae al límite elástico de reserva
 * (250 000 kN/m²) y un área de 1 m² hace que σ = |N| exactamente. Con eso η es
 * un cociente exacto en binario y se puede fijar en 1,00 clavado — que es el
 * valor que el resto del sistema tiene que leer igual en todas partes.
 */
const memberOf = (): MemberModel => ({
  id: 'B7', i: 'N1', j: 'N2', type: 'frame', E: 12_345, A: 1, I: 1,
});

const resultFor = (axial: number): MemberResult => ({
  memberId: 'B7', length: 4,
  localDisplacements: [], localEndForces: [], diagramSegments: [], diagramJumps: [],
  criticalPoints: [], diagram: [], deformation: [], deformationSegments: [], deformationCriticalPoints: [],
  maxAxial: axial, minAxial: 0, maxShear: 0, minShear: 0, maxMoment: 0, minMoment: 0,
} as unknown as MemberResult);

const setSelection = vi.fn();
const context = {
  project: {
    id: 'p', name: 'p', nodes: [], members: [memberOf()], nodalLoads: [], memberLoads: [],
    settings: { units: 'kN-m', language: 'es' },
  } as unknown as ProjectModel,
  analysis: { success: true, memberResults: [resultFor(FALLBACK_YIELD_STRENGTH)], nodeResults: [] } as unknown as AnalysisResult,
  setSelection,
};

vi.mock('../../store/ProjectContext', () => ({ useProject: () => context }));

const renderMeter = async () => {
  const { StructuralHealthMeter } = await import('./StructuralHealthMeter');
  return render(<StructuralHealthMeter />);
};

afterEach(() => { cleanup(); setSelection.mockClear(); });

describe('StructuralHealthMeter', () => {
  it('reads η = 1.00 exactly as critical, the same as the canvas heatmap', async () => {
    // El caso que discrepaba: η = 1,00 clavado salía rojo en el lienzo (`>=`) y
    // "carga elevada" aquí (`>`). Un único clasificador, una única lectura.
    context.analysis = { success: true, memberResults: [resultFor(FALLBACK_YIELD_STRENGTH)], nodeResults: [] } as unknown as AnalysisResult;
    await renderMeter();

    const card = screen.getByTestId('structural-health-meter');
    expect(demandTone(1)).toBe('overstressed');
    expect(card.className).toContain('tone-overstressed');
    expect(card.className).not.toContain('tone-warning');
    expect(screen.getByTestId('structural-health-ratio').textContent).toBe('η 1.00 · 100%');
  });

  it('still reads just below the yield ratio as a warning', async () => {
    context.analysis = { success: true, memberResults: [resultFor(FALLBACK_YIELD_STRENGTH * 0.9)], nodeResults: [] } as unknown as AnalysisResult;
    await renderMeter();
    expect(screen.getByTestId('structural-health-meter').className).toContain('tone-warning');
  });

  it('publishes utilisation and never a safety factor', async () => {
    context.analysis = { success: true, memberResults: [resultFor(FALLBACK_YIELD_STRENGTH / 2)], nodeResults: [] } as unknown as AnalysisResult;
    const { container } = await renderMeter();

    expect(screen.getByTestId('structural-health-ratio').textContent).toBe('η 0.50 · 50%');
    // "Factor" invitaba a leerlo como un coeficiente normativo; no aparece.
    expect(container.textContent).not.toMatch(/factor/i);
    // Y lo que sí aparece: elemento crítico, contribución y el aviso de que es
    // una estimación elástica, no una comprobación.
    expect(screen.getByTitle('Centrar la barra crítica en el lienzo')).toBeTruthy();
    expect(container.querySelector('.structural-health-split')).not.toBeNull();
    expect(container.querySelector('.structural-health-basis')?.textContent)
      .toMatch(/no una verificación normativa/);
  });

  it('sends the critical member to the canvas when it is located', async () => {
    context.analysis = { success: true, memberResults: [resultFor(FALLBACK_YIELD_STRENGTH / 2)], nodeResults: [] } as unknown as AnalysisResult;
    await renderMeter();
    await userEvent.setup().click(screen.getByTitle('Centrar la barra crítica en el lienzo'));
    expect(setSelection).toHaveBeenCalledWith({ kind: 'member', id: 'B7' });
  });
});
