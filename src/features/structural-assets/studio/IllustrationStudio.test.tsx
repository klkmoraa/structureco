// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IllustrationStudio } from './IllustrationStudio';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Illustration Studio surface', () => {
  it('exposes all assets through compact rails and only one active parameter section', async () => {
    const user = userEvent.setup();
    render(<IllustrationStudio language="es" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Estudio de ilustraciones' })).toBeTruthy();
    expect(within(screen.getByLabelText('Familias estructurales')).getAllByRole('button')).toHaveLength(10);
    expect(screen.getByLabelText('Activos estructurales')).toBeTruthy();
    expect(screen.getByTestId('studio-three-preview').getAttribute('data-structural-render')).toBe('three-live');
    expect(screen.getByRole('slider', { name: 'Ancho' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Altura' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Profundidad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pórtico de un vano' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Single-bay portal frame' })).toBeNull();
    expect(screen.getByText('Estructuras / Ilustraciones')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Material' }));
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Acero' })).toBeTruthy();
  });

  it('keeps Day/Night accessible and exposes PNG/SVG at 1x, 2x and 4x', async () => {
    const user = userEvent.setup();
    render(<IllustrationStudio language="es" onClose={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Vista' }));
    await user.click(screen.getByRole('button', { name: 'Noche' }));
    expect(screen.getByTestId('studio-preview-shell').getAttribute('data-preview-theme')).toBe('dark');
    expect(screen.getByRole('dialog').getAttribute('data-studio-theme')).toBe('dark');
    const scale = screen.getByLabelText('Escala de exportación') as HTMLSelectElement;
    expect([...scale.options].map((option) => option.value)).toEqual(['1', '2', '4']);
    expect(screen.getByRole('button', { name: 'Exportar PNG' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exportar SVG' })).toBeTruthy();
  });
});
