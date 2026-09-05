import { describe, expect, it } from 'vitest';
import {
  WorkerJobCancelledError,
  WorkerExecutionError,
  createAnalysisWorkerClient,
  createInlineAnalysisWorker,
  type WorkerEventLike,
  type WorkerLike,
} from './coalescingWorkerClient';
import { createHibbelerTributaryBeam } from '../data/defaultProject';
import { analyzeProjectAuto } from '../engine/pDelta';
import type { WorkerRequestEnvelope } from './workerProtocol';

class FakeTestWorker implements WorkerLike {
  static instances: FakeTestWorker[] = [];
  readonly posted: unknown[] = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: WorkerEventLike) => void>>();

  constructor() {
    FakeTestWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  addEventListener(type: string, listener: (event: WorkerEventLike) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: WorkerEventLike) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  replySuccess(requestId: number, result: unknown) {
    this.emit('message', {
      data: {
        protocolVersion: 1,
        type: 'success',
        domain: 'analysis',
        requestId,
        result,
      },
    });
  }

  replyError(requestId: number, message: string) {
    this.emit('message', {
      data: {
        protocolVersion: 1,
        type: 'error',
        domain: 'analysis',
        requestId,
        error: { code: 'DOMAIN_ERROR', message },
      },
    });
  }

  crash(message = 'Worker crash') {
    this.emit('error', { message });
  }

  emit(type: string, event: WorkerEventLike) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }
}

describe('CoalescingWorkerClient', () => {
  it('resuelve análisis y reutiliza el mismo worker en ejecuciones secuenciales (cero cold-starts)', async () => {
    FakeTestWorker.instances = [];
    const client = createAnalysisWorkerClient(() => new FakeTestWorker());
    const project = createHibbelerTributaryBeam();

    const firstPromise = client.submit({ project, combinationId: null });
    expect(FakeTestWorker.instances).toHaveLength(1);
    const worker = FakeTestWorker.instances[0];
    expect(worker.posted).toHaveLength(1);

    const firstReq = worker.posted[0] as WorkerRequestEnvelope<'analysis', unknown>;
    const dummyResult = analyzeProjectAuto(project, null);
    worker.replySuccess(firstReq.requestId, dummyResult);

    const firstResult = await firstPromise;
    expect(firstResult.success).toBe(true);

    // Segunda corrida secuencial: no debe crear nuevo worker
    const secondPromise = client.submit({ project, combinationId: null });
    expect(FakeTestWorker.instances).toHaveLength(1);
    expect(worker.posted).toHaveLength(2);

    const secondReq = worker.posted[1] as WorkerRequestEnvelope<'analysis', unknown>;
    worker.replySuccess(secondReq.requestId, dummyResult);

    const secondResult = await secondPromise;
    expect(secondResult.success).toBe(true);
    expect(worker.terminated).toBe(false);

    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('aplica conflación (Latest-Wins) cuando el worker está ocupado, cancelando la intermedia', async () => {
    FakeTestWorker.instances = [];
    const client = createAnalysisWorkerClient(() => new FakeTestWorker());
    const project = createHibbelerTributaryBeam();

    // 1. Tarea en vuelo
    const job1 = client.submit({ project, combinationId: 'run1' });
    const worker = FakeTestWorker.instances[0];
    expect(worker.posted).toHaveLength(1);
    expect(client.isBusy).toBe(true);
    expect(client.hasQueued).toBe(false);

    // 2. Llega tarea 2 mientras 1 está en vuelo -> queda en espera
    const job2 = client.submit({ project, combinationId: 'run2' });
    expect(client.hasQueued).toBe(true);

    // 3. Llega tarea 3 mientras 1 sigue en vuelo -> debe cancelar la 2 y reemplazarla en O(1)
    const job3 = client.submit({ project, combinationId: 'run3' });
    expect(client.hasQueued).toBe(true);

    // job2 debe ser rechazado inmediatamente con WorkerJobCancelledError por conflación
    await expect(job2).rejects.toBeInstanceOf(WorkerJobCancelledError);

    // Ahora completamos la tarea 1
    const req1 = worker.posted[0] as WorkerRequestEnvelope<'analysis', unknown>;
    const dummyResult = analyzeProjectAuto(project, null);
    worker.replySuccess(req1.requestId, dummyResult);

    await expect(job1).resolves.toEqual(dummyResult);

    // El cliente debe despachar automáticamente la tarea 3 (la más reciente)
    expect(worker.posted).toHaveLength(2);
    const req3 = worker.posted[1] as WorkerRequestEnvelope<'analysis', unknown>;
    expect(req3.payload).toMatchObject({ combinationId: 'run3' });

    worker.replySuccess(req3.requestId, dummyResult);
    await expect(job3).resolves.toEqual(dummyResult);

    client.dispose();
  });

  it('invalida tareas sin matar el worker caliente', async () => {
    FakeTestWorker.instances = [];
    const client = createAnalysisWorkerClient(() => new FakeTestWorker());
    const project = createHibbelerTributaryBeam();

    const job = client.submit({ project, combinationId: null });
    const worker = FakeTestWorker.instances[0];

    // Invalidar
    client.invalidate();
    await expect(job).rejects.toBeInstanceOf(WorkerJobCancelledError);

    // El worker NO fue terminado
    expect(worker.terminated).toBe(false);

    // Si el worker envía respuesta vieja tardía, se descarta silenciosamente
    const req = worker.posted[0] as WorkerRequestEnvelope<'analysis', unknown>;
    worker.replySuccess(req.requestId, analyzeProjectAuto(project, null));

    // La siguiente corrida puede reutilizar el worker inmediatamente
    const nextJob = client.submit({ project, combinationId: null });
    expect(FakeTestWorker.instances).toHaveLength(1);
    expect(worker.posted).toHaveLength(2);

    const nextReq = worker.posted[1] as WorkerRequestEnvelope<'analysis', unknown>;
    worker.replySuccess(nextReq.requestId, analyzeProjectAuto(project, null));
    await expect(nextJob).resolves.toMatchObject({ success: true });

    client.dispose();
  });

  it('se recupera ante crashes del worker recreándolo en la siguiente corrida', async () => {
    FakeTestWorker.instances = [];
    const client = createAnalysisWorkerClient(() => new FakeTestWorker(), false);
    const project = createHibbelerTributaryBeam();

    const job = client.submit({ project, combinationId: null });
    const worker1 = FakeTestWorker.instances[0];

    worker1.crash('Out of memory');
    await expect(job).rejects.toBeInstanceOf(WorkerExecutionError);
    expect(worker1.terminated).toBe(true);

    // Siguiente corrida crea worker nuevo tras el crash
    const nextJob = client.submit({ project, combinationId: null });
    expect(FakeTestWorker.instances).toHaveLength(2);
    const worker2 = FakeTestWorker.instances[1];

    const nextReq = worker2.posted[0] as WorkerRequestEnvelope<'analysis', unknown>;
    worker2.replySuccess(nextReq.requestId, analyzeProjectAuto(project, null));
    await expect(nextJob).resolves.toMatchObject({ success: true });

    client.dispose();
  });

  it('funciona de extremo a extremo con el worker en línea (createInlineAnalysisWorker)', async () => {
    const client = createAnalysisWorkerClient(createInlineAnalysisWorker);
    const project = createHibbelerTributaryBeam();

    const result = await client.submit({
      project,
      combinationId: null,
      includeEducationTrace: false,
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.nodeResults)).toBe(true);
    client.dispose();
  });
});
