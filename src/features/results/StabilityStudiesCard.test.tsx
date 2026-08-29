// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { useProject } from '../../store/ProjectContext';
import type { ModelStudiesState } from '../../engine/useModelStudies';
import { StabilityStudiesCard } from './StabilityStudiesCard';

afterEach(cleanup);

const studies: ModelStudiesState = {
  busy: null, error: null, run: vi.fn(),
  buckling: {
    success: true, criticalLoadFactor: 1.25, converged: true, residual: 1e-8, reason: '', freeDegreesOfFreedom: 3, referenceAxialForces: {}, issues: [],
    modes: [
      { criticalLoadFactor: 1.25, shape: [] },
      { criticalLoadFactor: 3.5, shape: [] },
    ],
  },
  modal: {
    success: true, converged: true, residual: 1e-8, reason: '', freeDegreesOfFreedom: 3, issues: [], totalMass: 2, formulation: 'consistent', cumulativeMassRatioX: 0.7, cumulativeMassRatioY: 0.9,
    modes: [
      { angularFrequency: 10, frequency: 1.5, period: 0.667, participatingMassRatioX: 0.4, participatingMassRatioY: 0.5, shape: [] },
      { angularFrequency: 20, frequency: 3.25, period: 0.308, participatingMassRatioX: 0.3, participatingMassRatioY: 0.4, shape: [] },
    ],
  },
};

const ModeShapeState = () => {
  const { modeShapeState } = useProject();
  return <output aria-label="Forma modal en lienzo">{modeShapeState ? `${modeShapeState.kind}:${modeShapeState.index}` : 'none'}</output>;
};

describe('StabilityStudiesCard', () => {
  it('lets the user inspect a selected buckling and modal mode rather than only the first one', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><StabilityStudiesCard studies={studies} /><ModeShapeState /></ProjectProvider>);
    expect(screen.getByText('λcr 1.250')).toBeTruthy();
    expect(screen.getByText('1.500 Hz')).toBeTruthy();

    const selectors = screen.getAllByLabelText('Modo calculado');
    await user.selectOptions(selectors[0], '1');
    await user.selectOptions(selectors[1], '1');

    expect(screen.getByText('λcr 3.500')).toBeTruthy();
    expect(screen.getByText('3.250 Hz')).toBeTruthy();
    expect(screen.getByText('0.308 s')).toBeTruthy();
    expect(screen.getByText('40.0 %')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: 'Mostrar forma en lienzo' })[0]);
    expect(screen.getByLabelText('Forma modal en lienzo').textContent).toBe('buckling:1');
  });

  it('keeps convergence, mass provenance, and study issues beside the selected result', () => {
    const studiesWithIssues: ModelStudiesState = {
      ...studies,
      buckling: { ...studies.buckling!, issues: [{ id: 'buckling-issue', severity: 'warning', title: 'Apoyos por revisar', message: 'Pandeo: revisar apoyos.' }] },
      modal: { ...studies.modal!, issues: [{ id: 'modal-issue', severity: 'warning', title: 'Masa incompleta', message: 'Modal: masa incompleta.' }] },
    };
    render(<ProjectProvider><StabilityStudiesCard studies={studiesWithIssues} /></ProjectProvider>);

    expect(screen.getAllByText('Residuo').length).toBe(2);
    expect(screen.getAllByText('GDL libres').length).toBe(2);
    expect(screen.getByText('Frecuencia angular')).toBeTruthy();
    expect(screen.getByText('10.000 rad/s')).toBeTruthy();
    expect(screen.getByText('2.000 Mg')).toBeTruthy();
    expect(screen.getByText('Pandeo: revisar apoyos.')).toBeTruthy();
    expect(screen.getByText('Modal: masa incompleta.')).toBeTruthy();
    expect(screen.getByText(/La masa se obtiene de la densidad/)).toBeTruthy();
  });
});
