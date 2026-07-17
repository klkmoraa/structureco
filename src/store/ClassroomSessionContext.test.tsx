// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ClassroomSessionProvider, useClassroomSession } from './ClassroomSessionContext';

afterEach(() => cleanup());

const Probe = () => {
  const session = useClassroomSession();
  return <>
    <output data-testid="state">{session.revealState}</output>
    <output data-testid="predictions">{JSON.stringify(session.predictions)}</output>
    <button onClick={session.startPredicting}>Predecir</button>
    <button onClick={session.revealResults}>Revelar</button>
    <button onClick={() => session.setPrediction('M1', 'moment', 42)}>Predecir M</button>
    <button onClick={() => session.setPrediction('M1', 'moment', null)}>Borrar M</button>
  </>;
};

describe('ClassroomSessionProvider', () => {
  it('stores finite numeric predictions and reveals results deliberately', async () => {
    const user = userEvent.setup();
    render(<ClassroomSessionProvider projectId="P1"><Probe /></ClassroomSessionProvider>);
    expect(screen.getByTestId('state').textContent).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Predecir' }));
    await user.click(screen.getByRole('button', { name: 'Predecir M' }));
    expect(screen.getByTestId('state').textContent).toBe('predicting');
    expect(screen.getByTestId('predictions').textContent).toBe('{"M1":{"moment":42}}');

    await user.click(screen.getByRole('button', { name: 'Revelar' }));
    expect(screen.getByTestId('state').textContent).toBe('revealed');
    await user.click(screen.getByRole('button', { name: 'Borrar M' }));
    expect(screen.getByTestId('predictions').textContent).toBe('{}');
  });

  it('resets attempts and visibility when the project changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClassroomSessionProvider projectId="P1"><Probe /></ClassroomSessionProvider>);
    await user.click(screen.getByRole('button', { name: 'Predecir M' }));
    await user.click(screen.getByRole('button', { name: 'Revelar' }));

    rerender(<ClassroomSessionProvider projectId="P2"><Probe /></ClassroomSessionProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('hidden');
      expect(screen.getByTestId('predictions').textContent).toBe('{}');
    });
  });
});
