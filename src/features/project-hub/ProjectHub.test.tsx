// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { ProjectProvider } from '../../store/ProjectContext';
import { InMemoryProjectRepository } from '../../storage/projectRepository';
import { ProjectHub } from './ProjectHub';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('ProjectHub', () => {
  it('shows exactly three compact recent projects without revision metadata', async () => {
    const repository = new InMemoryProjectRepository();
    for (const name of ['Uno', 'Dos', 'Tres', 'Cuatro']) {
      await repository.saveProject({ ...createDefaultProject(), id: `project-${name}`, name });
    }

    render(
      <ProjectProvider>
        <ProjectHub repository={repository} onOpen={() => undefined} variant="recent" limit={3} />
      </ProjectProvider>,
    );

    await screen.findByText('Cuatro');
    expect(document.querySelectorAll('.project-hub__row')).toHaveLength(3);
    expect(document.querySelector('.project-hub__revision')).toBeNull();
    expect(screen.queryByText('Uno')).toBeNull();
  });

  it('lists and opens a verified local project', async () => {
    const repository = new InMemoryProjectRepository();
    const project = { ...createDefaultProject(), name: 'Proyecto local verificado' };
    const record = await repository.saveProject(project);
    const onOpen = vi.fn();
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={onOpen} /></ProjectProvider>);

    expect(await screen.findByText('Proyecto local verificado')).toBeTruthy();
    expect(document.querySelector('[data-structural-asset-id="portal:single-bay"]')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Proyecto local verificado' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: record.id, revision: record.revision }));
  });

  it('duplicates a project without hiding the original', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject({ ...createDefaultProject(), name: 'Modelo base' });
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={() => undefined} /></ProjectProvider>);
    expect(await screen.findByText('Modelo base')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Más acciones para Modelo base' }));
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar Modelo base' }));
    await waitFor(() => expect(screen.getByText('Copia de Modelo base')).toBeTruthy());
    expect(screen.getByText('Modelo base')).toBeTruthy();
  });

  it('keeps secondary project actions inside one compact disclosure', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject({ ...createDefaultProject(), name: 'Pórtico compacto' });
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={() => undefined} /></ProjectProvider>);

    await screen.findByText('Pórtico compacto');
    expect(screen.getAllByRole('button', { name: /Abrir Pórtico compacto/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Más acciones para Pórtico compacto' })).toBeTruthy();
    expect(document.querySelectorAll('.project-hub__menu')).toHaveLength(1);
  });
});
