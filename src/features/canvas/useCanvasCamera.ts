import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasCamera as Camera } from './canvasInteraction';

const DEFAULT_CAMERA: Camera = { scale: 85, x: 260, y: 500 };

export const useCanvasCamera = (initialCamera: Camera = DEFAULT_CAMERA) => {
  const [camera, setCamera] = useState<Camera>(initialCamera);
  const cameraRef = useRef<Camera>(camera);
  const cameraFrameRef = useRef<number | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cameraFrameRef.current !== null) window.cancelAnimationFrame(cameraFrameRef.current);
      if (cameraAnimationRef.current !== null) window.cancelAnimationFrame(cameraAnimationRef.current);
      cameraFrameRef.current = null;
      cameraAnimationRef.current = null;
    };
  }, []);

  const updateCamera = useCallback((next: Camera | ((current: Camera) => Camera)) => {
    const resolved = typeof next === 'function' ? next(cameraRef.current) : next;
    cameraRef.current = resolved;
    if (cameraFrameRef.current !== null) return;
    cameraFrameRef.current = window.requestAnimationFrame(() => {
      cameraFrameRef.current = null;
      setCamera(cameraRef.current);
    });
  }, []);

  const stopCameraAnimation = useCallback(() => {
    if (cameraAnimationRef.current !== null) {
      window.cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
  }, []);

  const animateCameraTo = useCallback((target: Camera, durationMs = 280) => {
    stopCameraAnimation();
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (isTest || prefersReduced || durationMs <= 0) {
      updateCamera(target);
      return;
    }
    const start = { ...cameraRef.current };
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);

      const next: Camera = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        scale: start.scale + (target.scale - start.scale) * eased,
      };
      updateCamera(next);

      if (progress < 1) {
        cameraAnimationRef.current = window.requestAnimationFrame(step);
      } else {
        cameraAnimationRef.current = null;
      }
    };

    cameraAnimationRef.current = window.requestAnimationFrame(step);
  }, [stopCameraAnimation, updateCamera]);

  const toScreen = useCallback((x: number, y: number) => ({
    x: camera.x + x * camera.scale,
    y: camera.y - y * camera.scale,
  }), [camera]);

  const toModel = useCallback((screenX: number, screenY: number) => ({
    x: (screenX - camera.x) / camera.scale,
    y: (camera.y - screenY) / camera.scale,
  }), [camera]);

  return {
    camera,
    cameraRef,
    updateCamera,
    stopCameraAnimation,
    animateCameraTo,
    toScreen,
    toModel,
  };
};
