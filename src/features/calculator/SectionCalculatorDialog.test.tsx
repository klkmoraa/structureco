// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SectionCalculatorDialog } from './SectionCalculatorDialog';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('SectionCalculatorDialog', () => {
  it('updates the visible properties when the section and dimension change', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SectionCalculatorDialog open units="kN-m" language="es" onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Calculadora de sección' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'Círculo' }));
    const diameter = screen.getByRole('spinbutton', { name: 'Diámetro' });
    await user.clear(diameter);
    await user.type(diameter, '100');

    expect(screen.getByText('0.008 m²')).toBeTruthy();
    expect(screen.getByText('A = π·d²/4 · I = π·d⁴/64')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cerrar calculadora' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
