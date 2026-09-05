// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Folder } from 'lucide-react';
import { HomeSearch } from './HomeSearch';

afterEach(cleanup);
const options = [
  { id: 'templates', label: 'Plantillas', description: 'Pórticos, vigas y armaduras', icon: Folder, run: vi.fn() },
  { id: 'projects', label: 'Proyectos', description: 'Trabajo guardado', icon: Folder, run: vi.fn() },
];
describe('Home tool search', () => {
  it('finds descriptions without accents and executes the filtered keyboard result', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HomeSearch language="es" options={options} onClose={onClose} />);
    await user.type(screen.getByRole('combobox'), 'porticos');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    expect(options[0].run).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('offers an empty state, resets selection when filtering, and closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HomeSearch language="en" options={options} onClose={onClose} />);
    await user.type(screen.getByRole('combobox'), 'unmatched');
    expect(screen.getByRole('status').textContent).toContain('No tools found');
    await user.clear(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('combobox').getAttribute('aria-activedescendant')).toBe('home-search-projects');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
