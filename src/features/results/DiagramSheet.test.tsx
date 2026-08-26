// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHibbelerStyleDiagramPractice } from '../../data/defaultProject';
import { analyzeProject } from '../../engine/solver';
import { DiagramSheet } from './DiagramSheet';

afterEach(cleanup);

describe('DiagramSheet', () => {
  it('opens as a global, configurable reading surface and remembers its diagram choices per project', async () => {
    const user = userEvent.setup();
    const project = createHibbelerStyleDiagramPractice();
    const analysis = analyzeProject(project, null, { includeEducationTrace: false });
    const close = vi.fn();
    render(<DiagramSheet project={project} analysis={analysis} onClose={close} />);

    expect(screen.getByTestId('diagram-sheet')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Modelo estructural global' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cortante' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Momento' }).getAttribute('aria-pressed')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Axial' }));
    expect(screen.getByRole('img', { name: 'Diagrama global de Axial' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(`structureco:diagram-sheet:${project.id}:v1`) ?? '[]')).toContain('axial');

    await user.click(screen.getByRole('button', { name: 'Cerrar lámina de diagramas' }));
    expect(close).toHaveBeenCalledOnce();
  });
});
