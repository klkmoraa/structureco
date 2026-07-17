import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeProjectScenarios, type AnalysisScenario } from './envelope';
import type { ProjectModel } from '../types';

interface ScenarioWorkerResponse {
  requestId: number;
  scenarios?: AnalysisScenario[];
  error?: string;
}

export const useScenarioAnalysis = (project: ProjectModel) => {
  const [scenarios, setScenarios] = useState<AnalysisScenario[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  const clear = useCallback(() => {
    requestRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    setScenarios(null);
    setBusy(false);
    setError(null);
  }, []);

  useEffect(() => {
    setScenarios(null);
    setBusy(false);
    setError(null);
    return () => {
      requestRef.current += 1;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [project]);

  const run = useCallback(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    workerRef.current?.terminate();
    workerRef.current = null;
    setBusy(true);
    setError(null);
    const fallback = () => window.setTimeout(() => {
      if (requestRef.current !== requestId) return;
      try {
        setScenarios(analyzeProjectScenarios(project));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No se pudieron comparar los escenarios.');
      } finally {
        setBusy(false);
      }
    }, 0);
    if (typeof Worker === 'undefined') {
      fallback();
      return;
    }
    try {
      const worker = new Worker(new URL('../workers/scenarios.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      let settled = false;
      const fallbackOnce = () => {
        if (settled || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        fallback();
      };
      worker.onmessage = (event: MessageEvent<ScenarioWorkerResponse>) => {
        if (settled || event.data.requestId !== requestId || requestRef.current !== requestId) return;
        settled = true;
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        if (event.data.scenarios) setScenarios(event.data.scenarios);
        else setError(event.data.error ?? 'No se pudieron comparar los escenarios.');
        setBusy(false);
      };
      worker.onerror = fallbackOnce;
      worker.postMessage({ requestId, project });
    } catch {
      fallback();
    }
  }, [project]);

  return { scenarios, busy, error, run, clear };
};
