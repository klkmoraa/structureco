// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject, createDefaultProject } from '../../data/defaultProject';
import { FirstAnalysisGuide } from './FirstAnalysisGuide';

afterEach(cleanup);

const renderGuide = (project = createBlankProject()) => {
  const props = { onOpenTemplates: vi.fn(), onOpenGenerator: vi.fn(), onChooseTool: vi.fn(), onOpenDoctor: vi.fn(), onAnalyze: vi.fn(), onDismiss: vi.fn() };
  render(<FirstAnalysisGuide project={project} analysis={null} {...props} />);
  return props;
};

describe('FirstAnalysisGuide', () => {
  it('offers three non-blocking routes from an empty project', async () => {
    const user = userEvent.setup();
    const props = renderGuide();
    expect(screen.getByText('1. Elige cómo empezar')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Usar una plantilla' }));
    await user.click(screen.getByRole('button', { name: 'Abrir generador guiado' }));
    await user.click(screen.getByRole('button', { name: 'Dibujar desde cero' }));
    expect(props.onOpenTemplates).toHaveBeenCalledOnce();
    expect(props.onOpenGenerator).toHaveBeenCalledOnce();
    expect(props.onChooseTool).toHaveBeenCalledWith('node');
  });

  it('summarizes geometry, supports, loads and units before analysis', () => {
    const project = createDefaultProject();
    renderGuide(project);
    expect(screen.getByText('Resumen antes de analizar')).toBeTruthy();
    expect(screen.getAllByText('Geometría')).not.toHaveLength(0);
    expect(screen.getAllByText('Apoyos')).not.toHaveLength(0);
    expect(screen.getAllByText('Cargas')).not.toHaveLength(0);
    expect(screen.getByText(project.settings.units)).toBeTruthy();
  });

  it('keeps the guided journey in the project language', () => {
    const project = createDefaultProject();
    project.settings = { ...project.settings, language: 'en' };
    renderGuide(project);
    expect(screen.getByText('Summary before analysis')).toBeTruthy();
    expect(screen.getAllByText('Geometry')).not.toHaveLength(0);
    expect(screen.getAllByText('Supports')).not.toHaveLength(0);
    expect(screen.getAllByText('Loads')).not.toHaveLength(0);
  });
});
