// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasDirectorHud } from './CanvasDirectorHud';

afterEach(cleanup);

describe('CanvasDirectorHud', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(
      <CanvasDirectorHud
        visible={false}
        vibrationActive={false}
        onToggleVibration={vi.fn()}
        vibrationSpeed={1.0}
        onChangeSpeed={vi.fn()}
        vibrationAmplitude={1.0}
        onChangeAmplitude={vi.fn()}
        forceFlowActive={false}
        onToggleForceFlow={vi.fn()}
        stackActive={false}
        stackLayout="rows"
        onToggleStackLayout={vi.fn()}
        onFitCamera={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-testid="canvas-director-hud"]')).toBeNull();
  });

  it('renders controls and triggers toggles when visible', () => {
    const onToggleVibration = vi.fn();
    const onToggleForceFlow = vi.fn();
    const onToggleStackLayout = vi.fn();
    const onFitCamera = vi.fn();

    const { getByTestId } = render(
      <CanvasDirectorHud
        visible={true}
        vibrationActive={false}
        onToggleVibration={onToggleVibration}
        vibrationSpeed={1.0}
        onChangeSpeed={vi.fn()}
        vibrationAmplitude={1.0}
        onChangeAmplitude={vi.fn()}
        forceFlowActive={false}
        onToggleForceFlow={onToggleForceFlow}
        stackActive={true}
        stackLayout="rows"
        onToggleStackLayout={onToggleStackLayout}
        onFitCamera={onFitCamera}
      />,
    );

    const vibBtn = getByTestId('director-vibration-toggle');
    fireEvent.click(vibBtn);
    expect(onToggleVibration).toHaveBeenCalledTimes(1);

    const flowBtn = getByTestId('director-force-flow-toggle');
    fireEvent.click(flowBtn);
    expect(onToggleForceFlow).toHaveBeenCalledTimes(1);

    const layoutBtn = getByTestId('director-layout-toggle');
    fireEvent.click(layoutBtn);
    expect(onToggleStackLayout).toHaveBeenCalledTimes(1);

    const fitBtn = getByTestId('director-fit-btn');
    fireEvent.click(fitBtn);
    expect(onFitCamera).toHaveBeenCalledTimes(1);
  });

  it('handles reaction mode cycling', () => {
    const onCycleReactionMode = vi.fn();
    const { getByTestId } = render(
      <CanvasDirectorHud
        visible={true}
        vibrationActive={false}
        onToggleVibration={vi.fn()}
        vibrationSpeed={1.0}
        onChangeSpeed={vi.fn()}
        vibrationAmplitude={1.0}
        onChangeAmplitude={vi.fn()}
        forceFlowActive={false}
        onToggleForceFlow={vi.fn()}
        reactionMode="both"
        onCycleReactionMode={onCycleReactionMode}
        stackActive={false}
        stackLayout="rows"
        onToggleStackLayout={vi.fn()}
        onFitCamera={vi.fn()}
      />,
    );

    const btn = getByTestId('director-reaction-mode-toggle');
    expect(btn.textContent).toContain('Polar + XY');
    fireEvent.click(btn);
    expect(onCycleReactionMode).toHaveBeenCalledTimes(1);
  });

  it('handles solid mode toggle', () => {
    const onToggleSolidMode = vi.fn();
    const { getByTestId, rerender } = render(
      <CanvasDirectorHud
        visible={true}
        vibrationActive={false}
        onToggleVibration={vi.fn()}
        vibrationSpeed={1.0}
        onChangeSpeed={vi.fn()}
        vibrationAmplitude={1.0}
        onChangeAmplitude={vi.fn()}
        forceFlowActive={false}
        onToggleForceFlow={vi.fn()}
        solidModeActive={false}
        onToggleSolidMode={onToggleSolidMode}
        stackActive={false}
        stackLayout="rows"
        onToggleStackLayout={vi.fn()}
        onFitCamera={vi.fn()}
      />,
    );

    const solidBtn = getByTestId('director-solid-mode-toggle');
    expect(solidBtn.textContent).toContain('Wireframe');
    expect(solidBtn.className).not.toContain('is-active');

    fireEvent.click(solidBtn);
    expect(onToggleSolidMode).toHaveBeenCalledTimes(1);

    rerender(
      <CanvasDirectorHud
        visible={true}
        vibrationActive={false}
        onToggleVibration={vi.fn()}
        vibrationSpeed={1.0}
        onChangeSpeed={vi.fn()}
        vibrationAmplitude={1.0}
        onChangeAmplitude={vi.fn()}
        forceFlowActive={false}
        onToggleForceFlow={vi.fn()}
        solidModeActive={true}
        onToggleSolidMode={onToggleSolidMode}
        stackActive={false}
        stackLayout="rows"
        onToggleStackLayout={vi.fn()}
        onFitCamera={vi.fn()}
      />,
    );

    const activeBtn = getByTestId('director-solid-mode-toggle');
    expect(activeBtn.textContent).toContain('Sólido 2.5D');
    expect(activeBtn.className).toContain('is-active');
  });
});

