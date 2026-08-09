// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Experimental3DCanvas, type Experimental3DViewportController } from './Experimental3DCanvas';
import { buildExperimental3DScene } from './sceneModel';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

beforeAll(() => vi.stubGlobal('ResizeObserver', ResizeObserverMock));
afterEach(() => cleanup());

const scene = buildExperimental3DScene({
  nodes: [{ id: 'N1', x: 0, y: 0 }, { id: 'N2', x: 4, y: 3 }],
  members: [{ id: 'M1', i: 'N1', j: 'N2' }],
});

const fallbackCopy = {
  title: 'El visor 3D no está disponible',
  body: 'El navegador no pudo iniciar WebGL o perdió el contexto gráfico. El proyecto permanece intacto.',
  retry: 'Reintentar visor',
} as const;

const controller = (): Experimental3DViewportController => ({
  resize: vi.fn(),
  setView: vi.fn(),
  zoomBy: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn(),
});

describe('Experimental3DCanvas', () => {
  it('forwards camera commands and disposes the viewport on unmount', () => {
    const viewport = controller();
    const createController = vi.fn(() => viewport);
    const { rerender, unmount } = render(
      <Experimental3DCanvas
        model={scene}
        label="Visor de prueba"
        command={null}
        createController={createController}
        fallbackCopy={fallbackCopy}
      />,
    );

    expect(screen.getByRole('img', { name: 'Visor de prueba' })).toBeTruthy();
    expect(createController).toHaveBeenCalledOnce();

    rerender(<Experimental3DCanvas model={scene} label="Visor de prueba" command={{ id: 1, action: 'front' }} createController={createController} fallbackCopy={fallbackCopy} />);
    rerender(<Experimental3DCanvas model={scene} label="Visor de prueba" command={{ id: 2, action: 'isometric' }} createController={createController} fallbackCopy={fallbackCopy} />);
    rerender(<Experimental3DCanvas model={scene} label="Visor de prueba" command={{ id: 3, action: 'zoom-in' }} createController={createController} fallbackCopy={fallbackCopy} />);
    rerender(<Experimental3DCanvas model={scene} label="Visor de prueba" command={{ id: 4, action: 'zoom-out' }} createController={createController} fallbackCopy={fallbackCopy} />);
    rerender(<Experimental3DCanvas model={scene} label="Visor de prueba" command={{ id: 5, action: 'reset' }} createController={createController} fallbackCopy={fallbackCopy} />);

    expect(viewport.setView).toHaveBeenNthCalledWith(1, 'front');
    expect(viewport.setView).toHaveBeenNthCalledWith(2, 'isometric');
    expect(viewport.zoomBy).toHaveBeenNthCalledWith(1, 0.8);
    expect(viewport.zoomBy).toHaveBeenNthCalledWith(2, 1.25);
    expect(viewport.reset).toHaveBeenCalledOnce();

    unmount();
    expect(viewport.dispose).toHaveBeenCalledOnce();
  });

  it('replaces a lost WebGL context with an actionable fallback and retries', async () => {
    const first = controller();
    const second = controller();
    const onAvailabilityChange = vi.fn();
    const createController = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const user = userEvent.setup();
    render(
      <Experimental3DCanvas
        model={scene}
        label="Visor de prueba"
        command={null}
        createController={createController}
        fallbackCopy={fallbackCopy}
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    const canvas = screen.getByRole('img', { name: 'Visor de prueba' });
    fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }));

    expect(screen.getByRole('alert').textContent).toContain('El visor 3D no está disponible');
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(onAvailabilityChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: 'Reintentar visor' }));
    expect(screen.getByRole('img', { name: 'Visor de prueba' })).toBeTruthy();
    expect(createController).toHaveBeenCalledTimes(2);
    expect(onAvailabilityChange).toHaveBeenLastCalledWith(false);
  });

  it('shows the same fallback when WebGL initialization throws', () => {
    const createController = vi.fn(() => {
      throw new Error('WebGL unavailable');
    });

    render(
      <Experimental3DCanvas
        model={scene}
        label="Visor de prueba"
        command={null}
        createController={createController}
        fallbackCopy={fallbackCopy}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('El navegador no pudo iniciar WebGL');
  });
});
