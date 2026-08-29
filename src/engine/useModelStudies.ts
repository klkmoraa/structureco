import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectModel } from '../types';
import type { BucklingResult } from './buckling';
import type { ModalResult } from './modal';
import { analysisSignature } from './projectSignature';
import { handleStudiesEnvelope } from '../runtime/workerHandlers';
import { WORKER_PROTOCOL_VERSION, type StudiesWorkerPayload, type StudiesWorkerResult, type StudyKind, type WorkerRequestEnvelope, type WorkerResponseEnvelope } from '../runtime/workerProtocol';

export interface ModelStudiesState {
  buckling: BucklingResult | null; modal: ModalResult | null; busy: StudyKind | null; error: { kind: StudyKind; message: string } | null;
  run: (kind: StudyKind, options?: { modes?: number }) => void;
}

/** Estudios opcionales con worker por petición e invalidación por modelo/carga. */
export const useModelStudies = (project: ProjectModel, combinationId?: string | null): ModelStudiesState => {
  const [buckling, setBuckling] = useState<BucklingResult | null>(null);
  const [modal, setModal] = useState<ModalResult | null>(null);
  const [busy, setBusy] = useState<StudyKind | null>(null);
  const [error, setError] = useState<{ kind: StudyKind; message: string } | null>(null);
  const worker = useRef<Worker | null>(null); const request = useRef(0);
  const signature = useMemo(() => analysisSignature(project), [project]);
  const projectRef = useRef(project); const combinationRef = useRef(combinationId); projectRef.current = project; combinationRef.current = combinationId;
  const cancel = useCallback(() => { request.current += 1; worker.current?.terminate(); worker.current = null; }, []);
  useEffect(() => { cancel(); setBuckling(null); setModal(null); setBusy(null); setError(null); return cancel; }, [cancel, signature]);
  useEffect(() => { setBuckling(null); }, [combinationId]);
  const run = useCallback((kind: StudyKind, options?: { modes?: number }) => {
    cancel(); const id = request.current; const payload: StudiesWorkerPayload = { kind, project: projectRef.current, combinationId: combinationRef.current ?? null, modes: options?.modes ?? 3 };
    setBusy(kind); setError(null);
    const accept = (response: WorkerResponseEnvelope<'studies', StudiesWorkerResult>) => {
      if (request.current !== id) return;
      if (response.type === 'success') { if (response.result.kind === 'buckling') setBuckling(response.result.result); else setModal(response.result.result); }
      else setError({ kind, message: response.error.message });
      setBusy(null);
    };
    const fallback = () => window.setTimeout(() => accept(handleStudiesEnvelope({ protocolVersion: WORKER_PROTOCOL_VERSION, type: 'run', domain: 'studies', requestId: id, payload })), 0);
    if (typeof Worker === 'undefined') { fallback(); return; }
    try {
      const instance = new Worker(new URL('../workers/studies.worker.ts', import.meta.url), { type: 'module' }); worker.current = instance;
      instance.onmessage = (event: MessageEvent<WorkerResponseEnvelope<'studies', StudiesWorkerResult>>) => { instance.terminate(); if (worker.current === instance) worker.current = null; accept(event.data); };
      instance.onerror = () => { instance.terminate(); if (worker.current === instance) worker.current = null; fallback(); };
      const envelope: WorkerRequestEnvelope<'studies', StudiesWorkerPayload> = { protocolVersion: WORKER_PROTOCOL_VERSION, type: 'run', domain: 'studies', requestId: id, payload };
      instance.postMessage(envelope);
    } catch { fallback(); }
  }, [cancel]);
  return { buckling, modal, busy, error, run };
};
