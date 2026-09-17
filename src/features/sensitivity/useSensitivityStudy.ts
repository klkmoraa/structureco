import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analysisSignature } from '../../engine/projectSignature';
import type { LoadCombination, ProjectModel } from '../../types';
import { runSensitivityStudy, type SensitivityParameter, type SensitivityStudyResult } from './sensitivity';

interface SensitivityWorkerInput {
  project: ProjectModel;
  combination: LoadCombination | null;
  memberId: string;
  parameter: SensitivityParameter;
  percent: number;
}

interface SensitivityWorkerRequest { requestId: number; input: SensitivityWorkerInput }
interface SensitivityWorkerResponse { requestId: number; result?: SensitivityStudyResult; error?: string }

const combinationFor = (project: ProjectModel, combinationId: string | null | undefined): LoadCombination | null => {
  if (!combinationId) return null;
  const combination = project.combinations.find((candidate) => candidate.id === combinationId);
  if (combination) return combination;
  const loadCase = project.loadCases.find((candidate) => candidate.id === combinationId);
  return loadCase ? { id: loadCase.id, name: loadCase.name, factors: { [loadCase.id]: 1 } } : null;
};

export const useSensitivityStudy = (project: ProjectModel, combinationId?: string | null) => {
  const [result, setResult] = useState<SensitivityStudyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);
  const projectRef = useRef(project);
  const combinationIdRef = useRef(combinationId);
  projectRef.current = project;
  combinationIdRef.current = combinationId;
  const signature = useMemo(() => `${analysisSignature(project)}::${combinationId ?? ''}`, [combinationId, project]);

  const cancelPending = useCallback(() => {
    requestRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cancelPending();
    setResult(null);
    setBusy(false);
    setError(null);
  }, [cancelPending]);

  useEffect(() => {
    reset();
    return cancelPending;
  }, [cancelPending, reset, signature]);

  const run = useCallback((memberId: string, parameter: SensitivityParameter, percent = 10) => {
    cancelPending();
    const requestId = requestRef.current;
    const input: SensitivityWorkerInput = {
      project: structuredClone(projectRef.current),
      combination: combinationFor(projectRef.current, combinationIdRef.current),
      memberId,
      parameter,
      percent,
    };
    setResult(null);
    setBusy(true);
    setError(null);
    const accept = (response: SensitivityWorkerResponse) => {
      if (response.requestId !== requestId || requestRef.current !== requestId) return;
      if (response.result) setResult(response.result);
      else setError(response.error ?? 'No se pudo completar el estudio de sensibilidad.');
      setBusy(false);
    };
    const fallback = () => {
      fallbackTimerRef.current = window.setTimeout(() => {
        fallbackTimerRef.current = null;
        try {
          accept({ requestId, result: runSensitivityStudy(input.project, input.combination, input.memberId, input.parameter, input.percent) });
        } catch (studyError) {
          accept({ requestId, error: studyError instanceof Error ? studyError.message : 'No se pudo completar el estudio de sensibilidad.' });
        }
      }, 0);
    };
    if (typeof Worker === 'undefined') {
      fallback();
      return;
    }
    try {
      const worker = new Worker(new URL('./sensitivity.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      let settled = false;
      const fallbackOnce = () => {
        if (settled || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        fallback();
      };
      worker.onmessage = (event: MessageEvent<SensitivityWorkerResponse>) => {
        if (settled || event.data.requestId !== requestId || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        accept(event.data);
      };
      worker.onerror = fallbackOnce;
      const request: SensitivityWorkerRequest = { requestId, input };
      worker.postMessage(request);
    } catch {
      fallback();
    }
  }, [cancelPending]);

  return { result, busy, error, run, reset };
};
