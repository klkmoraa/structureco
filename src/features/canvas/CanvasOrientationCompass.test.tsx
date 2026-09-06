// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasOrientationCompass } from './CanvasOrientationCompass';

afterEach(cleanup);

describe('CanvasOrientationCompass', () => {
  it('renders compass disc and mode pill when visible', () => {
    render(
      <CanvasOrientationCompass
        onFit={vi.fn()}
        reactionMode="both"
        onCycleReactionMode={vi.fn()}
      />
    );

    expect(screen.getByTestId('orientation-compass')).toBeTruthy();
    expect(screen.getByTestId('orientation-compass-disc')).toBeTruthy();
    expect(screen.getByTestId('orientation-compass-mode-pill')).toBeTruthy();
    expect(screen.getByText('Polar + XY')).toBeTruthy();
  });

  it('calls onFit when clicking the compass disc', () => {
    const onFit = vi.fn();
    render(
      <CanvasOrientationCompass
        onFit={onFit}
        reactionMode="polar"
        onCycleReactionMode={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('orientation-compass-disc'));
    expect(onFit).toHaveBeenCalledTimes(1);
  });

  it('calls onCycleReactionMode when clicking the mode pill', () => {
    const onCycleReactionMode = vi.fn();
    render(
      <CanvasOrientationCompass
        onFit={vi.fn()}
        reactionMode="cartesian"
        onCycleReactionMode={onCycleReactionMode}
      />
    );

    fireEvent.click(screen.getByTestId('orientation-compass-mode-pill'));
    expect(onCycleReactionMode).toHaveBeenCalledTimes(1);
  });

  it('renders compact mode with is-compact class', () => {
    const { container } = render(
      <CanvasOrientationCompass
        onFit={vi.fn()}
        reactionMode="both"
        onCycleReactionMode={vi.fn()}
        compact={true}
      />
    );

    expect(container.querySelector('.canvas-orientation-compass.is-compact')).not.toBeNull();
  });

  it('renders nothing when visible is false', () => {
    const { container } = render(
      <CanvasOrientationCompass
        onFit={vi.fn()}
        reactionMode="both"
        onCycleReactionMode={vi.fn()}
        visible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
