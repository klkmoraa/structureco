import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectModel } from '../types';
import type { NumericCertificate } from './certificate';
import { analysisSignature } from './projectSignature';
import { handleCertificateEnvelope } from '../runtime/workerHandlers';
import {
  WORKER_PROTOCOL_VERSION,
  type CertificateWorkerPayload,
  type WorkerRequestEnvelope,
  type WorkerResponseEnvelope,
} from '../runtime/workerProtocol';

/**
 * Ejecuta el certificado sólo a petición. Un worker por solicitud mantiene las
 * cuatro resoluciones extra fuera del hilo que dibuja el lienzo; jsdom conserva
 * el mismo contrato mediante el manejador síncrono diferido.
 */
export const useNumericCertificate = (project: ProjectModel, combinationId?: string | null) => {
  const [certificate, setCertificate] = useState<NumericCertificate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);
  const signature = useMemo(() => analysisSignature(project), [project]);
  const projectRef = useRef(project);
  const combinationRef = useRef(combinationId);
  projectRef.current = project;
  combinationRef.current = combinationId;

  const cancelPending = useCallback(() => {
    requestRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelPending();
    setCertificate(null);
    setBusy(false);
    setError(null);
    return cancelPending;
  }, [cancelPending, signature]);

  useEffect(() => {
    setCertificate(null);
    setError(null);
  }, [combinationId]);

  const run = useCallback(() => {
    cancelPending();
    const requestId = requestRef.current;
    const payload: CertificateWorkerPayload = {
      project: projectRef.current,
      combinationId: combinationRef.current ?? null,
    };
    setBusy(true);
    setError(null);
    const accept = (response: WorkerResponseEnvelope<'certificate', NumericCertificate>) => {
      if (requestRef.current !== requestId) return;
      if (response.type === 'success') setCertificate(response.result);
      else setError(response.error.message);
      setBusy(false);
    };
    const fallback = () => {
      fallbackTimerRef.current = window.setTimeout(() => {
        fallbackTimerRef.current = null;
        accept(handleCertificateEnvelope({
          protocolVersion: WORKER_PROTOCOL_VERSION,
          type: 'run',
          domain: 'certificate',
          requestId,
          payload,
        }));
      }, 0);
    };
    if (typeof Worker === 'undefined') {
      fallback();
      return;
    }
    try {
      const worker = new Worker(new URL('../workers/certificate.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      let settled = false;
      const fallbackOnce = () => {
        if (settled || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        fallback();
      };
      worker.onmessage = (event: MessageEvent<WorkerResponseEnvelope<'certificate', NumericCertificate>>) => {
        if (settled || event.data.requestId !== requestId || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        accept(event.data);
      };
      worker.onerror = fallbackOnce;
      const request: WorkerRequestEnvelope<'certificate', CertificateWorkerPayload> = {
        protocolVersion: WORKER_PROTOCOL_VERSION,
        type: 'run',
        domain: 'certificate',
        requestId,
        payload,
      };
      worker.postMessage(request);
    } catch {
      fallback();
    }
  }, [cancelPending]);

  return { certificate, busy, error, run };
};
