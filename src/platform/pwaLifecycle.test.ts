import { describe, expect, it, vi } from 'vitest';
import { SERVICE_WORKER_URL, watchForPwaUpdates, type ServiceWorkerContainerPort, type ServiceWorkerRegistrationPort, type ServiceWorkerPort } from './pwaLifecycle';

class FakeWorker implements ServiceWorkerPort {
  state = 'installed';
  postMessage = vi.fn();
  private readonly listeners = new Set<() => void>();
  addEventListener(_type: 'statechange', listener: () => void) { this.listeners.add(listener); }
  removeEventListener(_type: 'statechange', listener: () => void) { this.listeners.delete(listener); }
  change(state: string) { this.state = state; for (const listener of this.listeners) listener(); }
  listenerCount() { return this.listeners.size; }
}

class FakeRegistration implements ServiceWorkerRegistrationPort {
  installing: ServiceWorkerPort | null = null;
  waiting: ServiceWorkerPort | null = null;
  private readonly listeners = new Set<() => void>();
  addEventListener(_type: 'updatefound', listener: () => void) { this.listeners.add(listener); }
  removeEventListener(_type: 'updatefound', listener: () => void) { this.listeners.delete(listener); }
  updateFound(worker: ServiceWorkerPort) { this.installing = worker; for (const listener of this.listeners) listener(); }
  listenerCount() { return this.listeners.size; }
}

class FakeContainer implements ServiceWorkerContainerPort {
  controller: object | null = {};
  private readonly registration: FakeRegistration;
  private readonly listeners = new Set<() => void>();
  constructor(registration: FakeRegistration) { this.registration = registration; }
  async register() { return this.registration; }
  addEventListener(_type: 'controllerchange', listener: () => void) { this.listeners.add(listener); }
  removeEventListener(_type: 'controllerchange', listener: () => void) { this.listeners.delete(listener); }
  changeController() { for (const listener of this.listeners) listener(); }
  listenerCount() { return this.listeners.size; }
}

describe('PWA update lifecycle', () => {
  it('uses a release-specific service-worker URL so installed shells revalidate direct canvas diagrams', () => {
    expect(SERVICE_WORKER_URL).toContain('canvas-direct-diagrams');
  });

  it('surfaces an already waiting update and activates it only on request', async () => {
    const registration = new FakeRegistration();
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const available = vi.fn();
    const controller = await watchForPwaUpdates(new FakeContainer(registration), available);

    expect(available).toHaveBeenCalledTimes(1);
    controller.applyUpdate();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('surfaces a newly installed worker when an older worker controls the page', async () => {
    const registration = new FakeRegistration();
    const container = new FakeContainer(registration);
    const available = vi.fn();
    await watchForPwaUpdates(container, available);
    const installing = new FakeWorker();
    installing.state = 'installing';

    registration.updateFound(installing);
    installing.change('installed');
    expect(available).toHaveBeenCalledTimes(1);
    expect(installing.listenerCount()).toBe(0);
  });

  it('cleans every listener and makes the controller inert after disposal', async () => {
    const registration = new FakeRegistration();
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const container = new FakeContainer(registration);
    const available = vi.fn();
    const onControllerChange = vi.fn();
    const controller = await watchForPwaUpdates(container, available, onControllerChange);

    expect(container.listenerCount()).toBe(1);
    expect(registration.listenerCount()).toBe(1);
    controller.dispose();
    controller.dispose();
    expect(container.listenerCount()).toBe(0);
    expect(registration.listenerCount()).toBe(0);

    container.changeController();
    const installing = new FakeWorker();
    registration.updateFound(installing);
    installing.change('installed');
    controller.applyUpdate();
    expect(onControllerChange).not.toHaveBeenCalled();
    expect(available).toHaveBeenCalledTimes(1);
    expect(waiting.postMessage).not.toHaveBeenCalled();
  });
});
