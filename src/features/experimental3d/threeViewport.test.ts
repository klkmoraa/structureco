// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildExperimental3DScene } from './sceneModel';
import { createThreeViewportController } from './threeViewport';

const rendererSpies = vi.hoisted(() => ({
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
  controlsDispose: vi.fn(),
  controlsUpdate: vi.fn(),
  changeListener: null as (() => void) | null,
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class WebGLRendererMock {
    setPixelRatio = rendererSpies.setPixelRatio;
    setSize = rendererSpies.setSize;
    render = rendererSpies.render;
    dispose = rendererSpies.dispose;
    forceContextLoss = rendererSpies.forceContextLoss;
  }
  return { ...actual, WebGLRenderer: WebGLRendererMock };
});

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: class OrbitControlsMock {
    target = {
      set: vi.fn(),
    };
    enableDamping = true;
    screenSpacePanning = false;
    addEventListener = vi.fn((_name: string, listener: () => void) => {
      rendererSpies.changeListener = listener;
    });
    removeEventListener = vi.fn();
    update = rendererSpies.controlsUpdate;
    dispose = rendererSpies.controlsDispose;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  rendererSpies.changeListener = null;
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 4 });
});

describe('createThreeViewportController', () => {
  it('builds the XY scene, caps DPR, responds to camera actions, and releases WebGL resources', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 900 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 600 });
    const model = buildExperimental3DScene({
      nodes: [{ id: 'N1', x: 0, y: 0 }, { id: 'N2', x: 6, y: 4 }],
      members: [{ id: 'M1', i: 'N1', j: 'N2' }],
    });

    const viewport = createThreeViewportController(canvas, model);

    expect(rendererSpies.setPixelRatio).toHaveBeenCalledWith(2);
    expect(rendererSpies.setSize).toHaveBeenCalledWith(900, 600, false);
    expect(rendererSpies.render).toHaveBeenCalled();
    const renderedScene = rendererSpies.render.mock.calls[0][0];
    expect(renderedScene.children.some((child: { type: string }) => child.type === 'LineSegments')).toBe(true);
    expect(renderedScene.children.some((child: { type: string }) => child.type === 'Points')).toBe(true);

    viewport.setView('front');
    viewport.setView('isometric');
    viewport.zoomBy(0.8);
    viewport.zoomBy(1.25);
    viewport.reset();
    viewport.resize();
    rendererSpies.changeListener?.();
    expect(rendererSpies.render.mock.calls.length).toBeGreaterThan(5);

    viewport.dispose();
    expect(rendererSpies.controlsDispose).toHaveBeenCalledOnce();
    expect(rendererSpies.dispose).toHaveBeenCalledOnce();
    expect(rendererSpies.forceContextLoss).toHaveBeenCalledOnce();
  });
});
