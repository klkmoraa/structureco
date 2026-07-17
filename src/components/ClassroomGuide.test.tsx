// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../data/defaultProject';
import { createSimpleBeamExercise } from '../education/exerciseTemplates';
import { ClassroomGuide } from './ClassroomGuide';

afterEach(() => cleanup());

describe('ClassroomGuide', () => {
  it('routes the current construction step to the requested tool', async () => {
    const user = userEvent.setup();
    const onChooseTool = vi.fn();
    render(<ClassroomGuide project={createBlankProject()} onChooseTool={onChooseTool} />);
    expect(screen.getByRole('progressbar', { name: /progreso del ejercicio/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /crear nodos/i }));
    expect(onChooseTool).toHaveBeenCalledWith('node');
  });

  it('offers analysis when geometry, supports and loads are ready', async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<ClassroomGuide project={createSimpleBeamExercise()} onAnalyze={onAnalyze} compact />);
    expect(screen.getByText(/modelo contiene lo esencial/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /analizar estructura/i }));
    expect(onAnalyze).toHaveBeenCalledOnce();
  });
});
