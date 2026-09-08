// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCanvasCamera } from './useCanvasCamera';

describe('useCanvasCamera', () => {
  it('initializes with default camera and transforms coordinates correctly', () => {
    const { result } = renderHook(() => useCanvasCamera({ scale: 100, x: 200, y: 300 }));

    expect(result.current.camera).toEqual({ scale: 100, x: 200, y: 300 });

    // Model (1, 2) -> Screen (200 + 1 * 100, 300 - 2 * 100) = (300, 100)
    const screenPt = result.current.toScreen(1, 2);
    expect(screenPt).toEqual({ x: 300, y: 100 });

    // Screen (300, 100) -> Model (1, 2)
    const modelPt = result.current.toModel(300, 100);
    expect(modelPt.x).toBeCloseTo(1);
    expect(modelPt.y).toBeCloseTo(2);
  });

  it('updates camera on demand', () => {
    const { result } = renderHook(() => useCanvasCamera({ scale: 50, x: 0, y: 0 }));

    act(() => {
      result.current.updateCamera({ scale: 75, x: 10, y: 20 });
    });

    // In test environment, animateCameraTo falls back immediately to updateCamera
    act(() => {
      result.current.animateCameraTo({ scale: 100, x: 50, y: 50 }, 0);
    });

    expect(result.current.cameraRef.current).toEqual({ scale: 100, x: 50, y: 50 });
  });
});
