// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { createEditorLayerState } from './editorLayers';
import { CanvasEvidenceRail } from './CanvasEvidenceRail';

describe('CanvasEvidenceRail', () => {
  it('offers the simultaneous N/V/M reading only when analysis data is available', async () => {
    const user = userEvent.setup();
    const onStackToggle = vi.fn();
    const props = {
      layers: createEditorLayerState(),
      dispatch: vi.fn(),
      resultTab: 'moment' as const,
      setResultTab: vi.fn(),
      visible: true,
      onStackToggle,
    };
    const view = render(<ProjectProvider><CanvasEvidenceRail
      {...props}
      stackAvailable={false}
    /></ProjectProvider>);
    expect((screen.getByRole('button', { name: 'Diagramas N, V y M simultáneos' }) as HTMLButtonElement).disabled).toBe(true);

    view.rerender(<ProjectProvider><CanvasEvidenceRail
      layers={createEditorLayerState()}
      dispatch={vi.fn()}
      resultTab="moment"
      setResultTab={vi.fn()}
      visible
      stackAvailable
      onStackToggle={onStackToggle}
    /></ProjectProvider>);

    const stack = screen.getByRole('button', { name: 'Diagramas N, V y M simultáneos' });
    expect(stack.getAttribute('aria-pressed')).toBe('false');
    await user.click(stack);
    expect(onStackToggle).toHaveBeenCalledOnce();
  });

  it('lets the active ACM choose lanes without allowing an empty stack', async () => {
    const user = userEvent.setup();
    const onStackQuantityToggle = vi.fn();
    render(<ProjectProvider><CanvasEvidenceRail
      layers={createEditorLayerState()}
      dispatch={vi.fn()}
      resultTab="moment"
      setResultTab={vi.fn()}
      visible
      stackActive
      stackAvailable
      stackQuantities={['moment']}
      onStackQuantityToggle={onStackQuantityToggle}
    /></ProjectProvider>);
    expect((document.querySelector('[data-evidence-stack-quantity="moment"]') as HTMLButtonElement).disabled).toBe(true);
    await user.click(document.querySelector('[data-evidence-stack-quantity="axial"]') as HTMLButtonElement);
    expect(onStackQuantityToggle).toHaveBeenCalledWith('axial');
  });
});
