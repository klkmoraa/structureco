export interface ServiceWorkerPort {
  state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
  removeEventListener(type: 'statechange', listener: () => void): void;
}

export interface ServiceWorkerRegistrationPort {
  installing: ServiceWorkerPort | null;
  waiting: ServiceWorkerPort | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
  removeEventListener(type: 'updatefound', listener: () => void): void;
}

export interface ServiceWorkerContainerPort {
  controller: object | null;
  register(scriptURL: string | URL, options?: RegistrationOptions): Promise<ServiceWorkerRegistrationPort>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface PwaUpdateController {
  applyUpdate(): void;
  dispose(): void;
}

// A changed script URL forces an already-installed PWA to check the current
// worker even when the browser still has the previous registration snapshot.
// Bump this token with a release that must invalidate an old mobile shell.
export const SERVICE_WORKER_URL = './sw.js?rev=2026-08-25-canvas-clarity';

export const watchForPwaUpdates = async (
  container: ServiceWorkerContainerPort,
  onUpdateAvailable: (controller: PwaUpdateController) => void,
  onControllerChange: () => void = () => undefined,
): Promise<PwaUpdateController> => {
  const registration = await container.register(SERVICE_WORKER_URL, { scope: './' });
  let waiting = registration.waiting;
  let disposed = false;
  let installing: ServiceWorkerPort | null = null;
  let installingStateChange: (() => void) | null = null;
  const detachInstalling = () => {
    if (installing && installingStateChange) installing.removeEventListener('statechange', installingStateChange);
    installing = null;
    installingStateChange = null;
  };
  const controller: PwaUpdateController = {
    applyUpdate: () => {
      if (!disposed) waiting?.postMessage({ type: 'SKIP_WAITING' });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      container.removeEventListener('controllerchange', onControllerChange);
      registration.removeEventListener('updatefound', onUpdateFound);
      detachInstalling();
    },
  };
  const publish = (worker: ServiceWorkerPort | null) => {
    if (!worker || disposed) return;
    waiting = worker;
    onUpdateAvailable(controller);
  };
  const onUpdateFound = () => {
    detachInstalling();
    const next = registration.installing;
    if (!next) return;
    const onStateChange = () => {
      if (next.state !== 'installed') return;
      detachInstalling();
      if (container.controller) publish(next);
    };
    installing = next;
    installingStateChange = onStateChange;
    next.addEventListener('statechange', onStateChange);
  };

  // Register the listener before publishing an already waiting worker. The
  // update path may activate it immediately, so installing this afterwards
  // would miss `controllerchange` and leave the old bundle on screen.
  container.addEventListener('controllerchange', onControllerChange);
  if (waiting) publish(waiting);
  registration.addEventListener('updatefound', onUpdateFound);
  return controller;
};
