// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersonalSection, writePersonalSections } from '../../data/personalSections';
import { ProjectProvider } from '../../store/ProjectContext';
import { PersonalSectionSelector } from './PersonalSectionSelector';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('PersonalSectionSelector', () => {
  it('offers personal geometry as an explicit A/I snapshot rather than a catalog identity', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const sections = createPersonalSection([], { name: 'Canal personal', definition: { family: 'channel', width: 0.2, depth: 0.5, webThickness: 0.01, flangeThickness: 0.02 } }, 'personal:channel', '2026-08-29T00:00:00.000Z');
    writePersonalSections(localStorage, sections);
    render(<ProjectProvider><PersonalSectionSelector units="kN-m" onSelect={onSelect} /></ProjectProvider>);

    const selector = screen.getByLabelText('Sección personal');
    await user.selectOptions(selector, 'personal:channel');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'personal:channel', properties: expect.objectContaining({ area: expect.any(Number), inertiaX: expect.any(Number) }) }));
  });

  it('creates a parametric section beside the member and requires a separate apply confirmation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ProjectProvider><PersonalSectionSelector units="kN-m" onSelect={onSelect} /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'Crear o administrar secciones personales' }));
    await user.click(screen.getByRole('button', { name: 'Nueva sección' }));
    await user.type(screen.getByLabelText('Nombre de la sección'), 'Viga creada aquí');
    await user.click(screen.getByRole('button', { name: 'Guardar sección' }));
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Aplicar Viga creada aquí al miembro' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Viga creada aquí', properties: expect.objectContaining({ area: expect.any(Number), inertiaX: expect.any(Number) }) }));
  });
});
