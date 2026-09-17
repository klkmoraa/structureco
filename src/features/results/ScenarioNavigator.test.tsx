// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import type { ScenarioNavigatorRow } from './scenarioNavigatorRows';
import { ScenarioNavigator } from './ScenarioNavigator';

afterEach(cleanup);

const rows: ScenarioNavigatorRow[] = [
  { id: 'combination:C1', name: 'Servicio', kind: 'combination', status: 'reliable', usable: true, isCurrent: true, values: { axial: 4, shear: -2, moment: 4 } },
  { id: 'case:LC2', name: 'Sin resolver', kind: 'case', status: 'failed', usable: false, isCurrent: false, reason: 'No se pudo resolver este escenario', values: { axial: null, shear: null, moment: null } },
  { id: 'combination:C2', name: 'Inestable', kind: 'combination', status: 'unreliable', usable: true, isCurrent: false, reason: 'Residuo fuera de margen', values: { axial: 8, shear: 3, moment: 12 } },
];

describe('ScenarioNavigator', () => {
  it('lets the user use a combination and keeps a failure cause as readable text', async () => {
    const user = userEvent.setup();
    const onUseCombination = vi.fn();

    render(<ProjectProvider><ScenarioNavigator rows={rows} onUseCombination={onUseCombination} onCompare={vi.fn()} /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: /usar combinación servicio/i }));

    expect(onUseCombination).toHaveBeenCalledWith('C1');
    expect(screen.getByText('No se pudo resolver este escenario')).toBeTruthy();
    expect(screen.getByRole('button', { name: /todos/i })).toBeTruthy();
  });

  it('filters to failed scenarios without losing the selected filter state', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><ScenarioNavigator rows={rows} onUseCombination={vi.fn()} onCompare={vi.fn()} /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: /fallidos/i }));

    expect(screen.queryByText('Servicio')).toBeNull();
    expect(screen.getByText('Sin resolver')).toBeTruthy();
    expect(screen.getByText('Inestable')).toBeTruthy();
  });
});
