// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { ProjectProvider } from '../../store/ProjectContext';
import { InMemoryProjectRepository } from '../../storage/projectRepository';
import { getLocalMetrics, setLocalMetricsOptIn } from '../../analytics/localMetrics';
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

  it('removes a project only after the user confirms the destructive action', async () => {
    const repository = new InMemoryProjectRepository();
    await repository.saveProject({ ...createDefaultProject(), name: 'Proyecto temporal' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={() => undefined} /></ProjectProvider>);

    await screen.findByText('Proyecto temporal');
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones para Proyecto temporal' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Proyecto temporal' }));

    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Proyecto temporal')).toBeNull());
    expect(await repository.listProjects()).toHaveLength(0);
  });

  it('compares a conflict, previews it read-only, and backs up the saved version before recovery', async () => {
    const repository = new InMemoryProjectRepository();
    const saved = { ...createDefaultProject(), name: 'Versión guardada', nodes: [], members: [], nodalLoads: [], memberLoads: [], memberInitialEffects: [], prescribedDisplacements: [] };
    await repository.saveProject(saved);
    await repository.createRecovery({ ...createDefaultProject(), id: saved.id, name: 'Edición recuperada' }, 'conflict');
    const onOpen = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={onOpen} /></ProjectProvider>);

    expect(await screen.findByText('Conflicto de versiones')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Abrir Versión guardada' })).toBeNull();
    expect(document.querySelector('[data-recovery-version="saved"]')?.textContent).toContain('0 barras · 0 nudos');
    expect(document.querySelector('[data-recovery-version="recovered"]')?.textContent).toContain('3 barras · 4 nudos');
    expect(document.querySelector('[data-recovery-version="saved"] time')?.getAttribute('dateTime')).toBeTruthy();
    expect(document.querySelector('[data-recovery-version="recovered"] time')?.getAttribute('dateTime')).toBeTruthy();
    expect(screen.getByText('Diferencia: 3 barras · 4 nudos · 3 cargas.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Ver edición en solo lectura' }));
    expect(screen.getByText('Vista previa de solo lectura')).toBeTruthy();
    expect(document.querySelector('[data-recovery-readonly] svg')).toBeTruthy();
    expect(screen.getByText(/Sólo lectura: esta vista no modifica ni guarda la recuperación/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Usar edición recuperada' }));

    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ name: 'Edición recuperada' })));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('copia de seguridad'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Diferencia: 3 barras · 4 nudos · 3 cargas.'));
    expect((await repository.listRecoveries(saved.id)).some((record) => record.reason === 'manual' && record.project.name === 'Versión guardada')).toBe(true);
  });

  it('keeps the saved side only after showing consequences and records the opt-in decision', async () => {
    const repository = new InMemoryProjectRepository();
    const saved = { ...createDefaultProject(), name: 'Guardada', nodes: [], members: [], nodalLoads: [], memberLoads: [], memberInitialEffects: [], prescribedDisplacements: [] };
    await repository.saveProject(saved);
    const recovery = await repository.createRecovery({ ...createDefaultProject(), id: saved.id, name: 'Recuperada' }, 'conflict');
    setLocalMetricsOptIn(window.localStorage, true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ProjectProvider><ProjectHub repository={repository} onOpen={() => undefined} /></ProjectProvider>);

    await screen.findByText('Conflicto de versiones');
    await userEvent.click(screen.getByRole('button', { name: 'Conservar versión guardada' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('La edición recuperada no se podrá restaurar después.'));
    await waitFor(() => expect(repository.listRecoveries(saved.id)).resolves.not.toContainEqual(expect.objectContaining({ id: recovery.id })));
    await waitFor(() => expect(getLocalMetrics(window.localStorage).events).toContainEqual(expect.objectContaining({ name: 'recovery_decision', code: 'keep-saved', entityDelta: 10 })));
  });
});
