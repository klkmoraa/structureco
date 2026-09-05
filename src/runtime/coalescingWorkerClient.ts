import type { AnalysisWorkerResponse } from '../engine/analysisWorkerProtocol';
import type { AnalysisResult } from '../types';
import {
  WORKER_PROTOCOL_VERSION,
  type AnalysisWorkerPayload,
  type WorkerRequestEnvelope,
  type WorkerResponseEnvelope,
} from './workerProtocol';

export interface WorkerEventLike {
  readonly data?: unknown;
  readonly message?: string;
}

export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  addEventListener(type: string, listener: (event: WorkerEventLike) => void): void;
  removeEventListener(type: string, listener: (event: WorkerEventLike) => void): void;
}

export type WorkerFactory = () => WorkerLike;

export class WorkerJobCancelledError extends Error {
  constructor(message = 'La tarea de análisis fue cancelada.') {
    super(message);
    this.name = 'WorkerJobCancelledError';
  }
}

export class WorkerExecutionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'WorkerExecutionError';
    this.code = code;
  }
}

interface InFlightJob<TPayload, TResult> {
  readonly requestId: number;
  readonly payload: TPayload;
  readonly resolve: (result: TResult) => void;
  readonly reject: (error: Error) => void;
  cancelled: boolean;
}

interface QueuedJob<TPayload, TResult> {
  readonly requestId: number;
  readonly payload: TPayload;
  readonly resolve: (result: TResult) => void;
  readonly reject: (error: Error) => void;
}

export interface CoalescingClientOptions<TPayload, TResult> {
  buildRequest: (requestId: number, payload: TPayload) => unknown;
  extractResponse: (data: unknown) => { requestId: number; result?: TResult; error?: Error } | null;
  fallback?: (payload: TPayload) => Promise<TResult> | TResult;
}

/**
 * Cliente de Web Worker con ciclo de vida persistente y contrapresión (backpressure) por conflación.
 *
 * Política de contrapresión:
 * 1. Como máximo UNA tarea en vuelo en el worker (`inFlight`).
 * 2. Como máximo UNA tarea en espera (`queuedJob`).
 * 3. Conflación (Latest-Wins): Si el worker está ocupado y llega una nueva tarea,
 *    se cancela la tarea previamente encolada y se reemplaza por la más reciente en O(1).
 * 4. Cancelación cooperativa de hilo caliente: `invalidate()` cancela la tarea en vuelo
 *    sin matar el worker (`worker.terminate()`), evitando el costo de cold-start (15-60 ms)
 *    y la presión en el Garbage Collector.
 */
export class CoalescingWorkerClient<TPayload, TResult> {
  private readonly createWorker: WorkerFactory;
  private readonly options: CoalescingClientOptions<TPayload, TResult>;
  private worker: WorkerLike | null = null;
  private detach: (() => void) | null = null;
  private inFlight: InFlightJob<TPayload, TResult> | null = null;
  private queuedJob: QueuedJob<TPayload, TResult> | null = null;
  private nextRequestId = 0;
  private disposed = false;

  constructor(createWorker: WorkerFactory, options: CoalescingClientOptions<TPayload, TResult>) {
    this.createWorker = createWorker;
    this.options = options;
  }

  /**
   * Envía una tarea al worker. Si ya hay una en curso, la almacena en el buffer de espera
   * descartando cualquier tarea previa en espera (política de conflación).
   */
  submit(payload: TPayload): Promise<TResult> {
    if (this.disposed) {
      return Promise.reject(new WorkerJobCancelledError('El cliente de worker fue desechado.'));
    }

    this.nextRequestId += 1;
    const requestId = this.nextRequestId;

    return new Promise<TResult>((resolve, reject) => {
      if (!this.inFlight) {
        this.inFlight = { requestId, payload, resolve, reject, cancelled: false };
        this.dispatch(this.inFlight);
      } else {
        // Conflación: Reemplazar tarea encolada anterior
        if (this.queuedJob) {
          const previous = this.queuedJob;
          this.queuedJob = null;
          previous.reject(new WorkerJobCancelledError('Reemplazada por una corrida más reciente.'));
        }
        this.queuedJob = { requestId, payload, resolve, reject };
      }
    });
  }

  /**
   * Invalida los cálculos pendientes y en vuelo sin terminar el worker.
   * La respuesta del worker a la tarea actual será descartada silenciosamente.
   */
  invalidate(): void {
    if (this.queuedJob) {
      const queued = this.queuedJob;
      this.queuedJob = null;
      queued.reject(new WorkerJobCancelledError('Cancelado por invalidación.'));
    }

    if (this.inFlight) {
      this.inFlight.cancelled = true;
      this.inFlight.reject(new WorkerJobCancelledError('Cancelado por invalidación.'));
    }
  }

  /**
   * Termina el worker subyacente y limpia tareas activas.
   * Se volverá a instanciar en el próximo `submit()`.
   */
  terminateWorker(): void {
    this.invalidate();
    this.teardown();
  }

  /**
   * Desecha permanentemente el cliente y su worker.
   */
  dispose(): void {
    this.terminateWorker();
    this.disposed = true;
  }

  get isBusy(): boolean {
    return this.inFlight !== null && !this.inFlight.cancelled;
  }

  get hasQueued(): boolean {
    return this.queuedJob !== null;
  }

  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const worker = this.createWorker();

    const onMessage = (event: WorkerEventLike) => this.receive(event?.data);
    const onError = (event: WorkerEventLike) => this.handleWorkerCrash(event);

    if (typeof worker.addEventListener === 'function') {
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      this.detach = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
    } else {
      const anyWorker = worker as unknown as {
        onmessage: ((event: WorkerEventLike) => void) | null;
        onerror: ((event: WorkerEventLike) => void) | null;
      };
      anyWorker.onmessage = onMessage;
      anyWorker.onerror = onError;
      this.detach = () => {
        anyWorker.onmessage = null;
        anyWorker.onerror = null;
      };
    }

    this.worker = worker;
    return worker;
  }

  private dispatch(job: InFlightJob<TPayload, TResult>): void {
    try {
      const worker = this.ensureWorker();
      const message = this.options.buildRequest(job.requestId, job.payload);
      worker.postMessage(message);
    } catch (error) {
      this.inFlight = null;
      if (this.options.fallback && !job.cancelled) {
        Promise.resolve()
          .then(() => this.options.fallback!(job.payload))
          .then((res) => job.resolve(res))
          .catch((err) => job.reject(err instanceof Error ? err : new WorkerExecutionError('FALLBACK_FAILED', String(err))));
      } else {
        job.reject(error instanceof Error ? error : new WorkerExecutionError('POST_MESSAGE_FAILED', 'Fallo al enviar mensaje al worker.'));
      }
      this.dispatchNextIfQueued();
    }
  }

  private receive(data: unknown): void {
    const inFlight = this.inFlight;
    if (!inFlight) return;

    const parsed = this.options.extractResponse(data);
    if (!parsed || parsed.requestId !== inFlight.requestId) return;

    this.inFlight = null;

    if (!inFlight.cancelled) {
      if (parsed.error) {
        inFlight.reject(parsed.error);
      } else {
        inFlight.resolve(parsed.result as TResult);
      }
    }

    this.dispatchNextIfQueued();
  }

  private dispatchNextIfQueued(): void {
    if (!this.queuedJob || this.inFlight) return;

    const next = this.queuedJob;
    this.queuedJob = null;
    this.inFlight = { ...next, cancelled: false };
    this.dispatch(this.inFlight);
  }

  private handleWorkerCrash(event: WorkerEventLike): void {
    const inFlight = this.inFlight;
    const queued = this.queuedJob;
    this.inFlight = null;
    this.queuedJob = null;
    this.teardown();

    const error = new WorkerExecutionError(
      'WORKER_CRASH',
      event?.message ?? 'El worker experimentó un error irrecuperable.',
    );

    if (inFlight && !inFlight.cancelled) {
      if (this.options.fallback) {
        Promise.resolve()
          .then(() => this.options.fallback!(inFlight.payload))
          .then((res) => inFlight.resolve(res))
          .catch((err) => inFlight.reject(err instanceof Error ? err : error));
      } else {
        inFlight.reject(error);
      }
    }
    if (queued) {
      if (this.options.fallback) {
        Promise.resolve()
          .then(() => this.options.fallback!(queued.payload))
          .then((res) => queued.resolve(res))
          .catch((err) => queued.reject(err instanceof Error ? err : error));
      } else {
        queued.reject(error);
      }
    }
  }

  private teardown(): void {
    this.detach?.();
    this.detach = null;
    this.worker?.terminate();
    this.worker = null;
  }
}

export const isBrowserWorkerSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.Worker === 'function' || typeof Worker === 'function';
};

/**
 * Worker en línea para entornos sin Web Worker o pruebas (JSDOM).
 */
export const createInlineAnalysisWorker = (): WorkerLike => {
  const listeners = new Map<string, Set<(event: WorkerEventLike) => void>>();
  let alive = true;
  return {
    postMessage(message: unknown) {
      if (!alive) return;
      void import('./workerHandlers').then(({ handleAnalysisEnvelope }) => {
        if (!alive) return;
        const response = handleAnalysisEnvelope(message as WorkerRequestEnvelope<'analysis', AnalysisWorkerPayload>);
        for (const listener of [...(listeners.get('message') ?? [])]) {
          listener({ data: response });
        }
      });
    },
    terminate() {
      alive = false;
      listeners.clear();
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
  };
};

/**
 * Fábrica por defecto del cliente de análisis estructural 2D con backpressure.
 */
export const createAnalysisWorkerClient = (
  customFactory?: WorkerFactory,
  enableFallback = true,
): CoalescingWorkerClient<AnalysisWorkerPayload, AnalysisResult> => {
  const factory: WorkerFactory =
    customFactory ??
    (() => {
      if (typeof Worker !== 'undefined') {
        return new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
      }
      return createInlineAnalysisWorker();
    });

  return new CoalescingWorkerClient<AnalysisWorkerPayload, AnalysisResult>(factory, {
    buildRequest: (requestId, payload) => ({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      type: 'run',
      domain: 'analysis',
      requestId,
      payload,
    }),
    extractResponse: (data) => {
      if (!data || typeof data !== 'object') return null;

      if ('protocolVersion' in data) {
        const envelope = data as WorkerResponseEnvelope<'analysis', AnalysisResult>;
        if (envelope.domain !== 'analysis') return null;
        if (envelope.type === 'success') {
          return { requestId: envelope.requestId, result: envelope.result };
        }
        return {
          requestId: envelope.requestId,
          error: new WorkerExecutionError(envelope.error.code, envelope.error.message),
        };
      }

      if ('type' in data && 'requestId' in data) {
        const legacy = data as AnalysisWorkerResponse;
        if (legacy.type === 'analysis-result') {
          return { requestId: legacy.requestId, result: legacy.result };
        }
        return {
          requestId: legacy.requestId,
          error: new WorkerExecutionError('ANALYSIS_ERROR', legacy.message),
        };
      }

      return null;
    },
    fallback: enableFallback
      ? async (payload) => {
          const { analyzeProjectAuto } = await import('../engine/pDelta');
          const combination = payload.combinationId
            ? payload.project.combinations.find((item) => item.id === payload.combinationId) ?? null
            : null;
          return analyzeProjectAuto(payload.project, combination, {
            includeEducationTrace: payload.includeEducationTrace,
          });
        }
      : undefined,
  });
};
