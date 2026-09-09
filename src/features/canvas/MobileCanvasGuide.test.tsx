// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { MobileCanvasGuide } from './MobileCanvasGuide';

afterEach(cleanup);

describe('MobileCanvasGuide', () => {
  it('explains the model gesture and exposes a named fit action', async () => {
    const user = userEvent.setup();
    const onFit = vi.fn();
    render(<ProjectProvider><MobileCanvasGuide solved={false} onFit={onFit} /></ProjectProvider>);

    expect(screen.getByText('Vista del modelo')).toBeTruthy();
    expect(screen.getByText('Arrastra para mover · pellizca para ampliar')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ajustar modelo a la vista' }));
    expect(onFit).toHaveBeenCalledTimes(1);
  });

  it('changes the explanation after analysis without changing the fit control', () => {
    render(<ProjectProvider><MobileCanvasGuide solved onFit={() => undefined} /></ProjectProvider>);

    expect(screen.getByText('Resultados visibles')).toBeTruthy();
    expect(screen.getByText('Toca Resultados para abrir el detalle')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajustar modelo a la vista' })).toBeTruthy();
  });
});
