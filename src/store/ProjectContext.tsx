import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { unavailableAnalysis } from '../engine/analysisFailure';
import type { AnalysisWorkerRequest, AnalysisWorkerResponse } from '../engine/analysisWorkerProtocol';
import { normalizeProject } from '../data/migrate';
import { loadProjectFromStorage, saveProjectToStorage } from '../data/projectStorage';
import { repairProjectTopology } from '../data/modelOperations';
import type { AnalysisResult, DiagramQuantity, ProjectModel, Selection, ThemeMode, Tool } from '../types';

export type ResultTab = 'summary' | 'reactions' | 'axial' | 'shear' | 'moment' | 'influence' | 'deformed' | 'learn' | 'issues';
export interface ResultCursor { memberId: string; x: number; pinned: boolean }
export interface InfluenceCanvasState {
  pathMemberIds: string[];
  target: { memberId: string; x: number; quantity: DiagramQuantity };
  source?: { memberId: string; ratio: number; ordinate: number };
}

interface ProjectContextValue {
  project: ProjectModel;
  analysis: AnalysisResult | null;
  activeTool: Tool;
  selection: Selection;
  theme: ThemeMode;
  resultTab: ResultTab;
  selectedCombinationId: string;
  isAnalyzing: boolean;
  learningFocus: { nodeIds: string[]; memberIds: string[] } | null;
  resultCursor: ResultCursor | null;
  influenceCanvasState: InfluenceCanvasState | null;
  canUndo: boolean;
  canRedo: boolean;
  storageIssue: 'recovered' | 'load-failed' | 'save-failed' | null;
  storageMessage: string | null;
  renameProject: (name: string) => void;
  setActiveTool: (tool: Tool) => void;
  setSelection: (selection: Selection) => void;
  setTheme: (theme: ThemeMode) => void;
  setResultTab: (tab: ResultTab) => void;
  setSelectedCombinationId: (id: string) => void;
  setLearningFocus: (focus: { nodeIds: string[]; memberIds: string[] } | null) => void;
  setResultCursor: (cursor: ResultCursor | null) => void;
  setInfluenceCanvasState: (state: InfluenceCanvasState | null) => void;
  updateProject: (updater: (project: ProjectModel) => ProjectModel, analyzeAfter?: boolean) => void;
  updateProjectView: (updater: (project: ProjectModel) => ProjectModel) => void;
  beginProjectTransaction: () => void;
  updateProjectTransient: (updater: (project: ProjectModel) => ProjectModel) => void;
  moveNodeTransient: (nodeId: string, point: { x: number; y: number }) => void;
  commitProjectTransaction: () => void;
  cancelProjectTransaction: () => void;
  replaceProject: (project: ProjectModel, restoredAnalysis?: AnalysisResult) => void;
  undo: () => void;
  redo: () => void;
  analyze: () => void;
  clearAnalysis: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const runFallbackAnalysis = async (project: ProjectModel, combinationId: string) => {
  const { analyzeProjectAuto } = await import('../engine/pDelta');
  const combination = project.combinations.find((item) => item.id === combinationId) ?? null;
  return analyzeProjectAuto(project, combination);
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [initial] = useState(() => loadProjectFromStorage(localStorage));
  const [project, setProject] = useState<ProjectModel>(initial.project);
  const [past, setPast] = useState<ProjectModel[]>([]);
  const [future, setFuture] = useState<ProjectModel[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selection, setSelectionState] = useState<Selection>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('structureCo.theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [resultTab, setResultTab] = useState<ResultTab>('moment');
  const [selectedCombinationId, setSelectedCombinationIdState] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [learningFocus, setLearningFocus] = useState<{ nodeIds: string[]; memberIds: string[] } | null>(null);
  const [resultCursor, setResultCursor] = useState<ResultCursor | null>(null);
  const [influenceCanvasState, setInfluenceCanvasState] = useState<InfluenceCanvasState | null>(null);
  const [transactionActive, setTransactionActive] = useState(false);
  const [persistenceRevision, setPersistenceRevision] = useState(0);
  const [storageState, setStorageState] = useState<{
    issue: 'recovered' | 'load-failed' | 'save-failed' | null;
    message: string | null;
  }>(() => ({
    issue: initial.recoveredFromBackup ? 'recovered' : initial.recoveryMessage ? 'load-failed' : null,
    message: initial.recoveryMessage ?? null,
  }));
  const projectRef = useRef(project);
  const selectionRef = useRef(selection);
  const transactionStartRef = useRef<ProjectModel | null>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const analysisRevisionRef = useRef(0);
  const analysisWorkerRef = useRef<Worker | null>(null);

  const setSelection = useCallback((next: Selection) => {
    selectionRef.current = next;
    setSelectionState(next);
  }, []);

  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { selectionRef.current = selection; }, [selection]);

  const invalidateAnalysis = useCallback(() => {
    analysisRevisionRef.current += 1;
    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    analysisWorkerRef.current?.terminate();
    analysisWorkerRef.current = null;
    setIsAnalyzing(false);
    setAnalysis(null);
    setResultCursor(null);
    setInfluenceCanvasState(null);
  }, []);

  useEffect(() => () => {
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisWorkerRef.current?.terminate();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('structureCo.theme', theme);
  }, [theme]);

  useEffect(() => {
    if (transactionActive) return;
    const handle = window.setTimeout(() => {
      try {
        saveProjectToStorage(localStorage, project);
        setStorageState((current) => current.issue === 'save-failed'
          ? { issue: null, message: null }
          : current);
      } catch (error) {
        setStorageState({
          issue: 'save-failed',
          message: error instanceof Error ? error.message : 'No se pudo guardar el proyecto.',
        });
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [project, persistenceRevision, transactionActive]);

  const analyze = useCallback(() => {
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisWorkerRef.current?.terminate();
    analysisWorkerRef.current = null;
    const currentProject = projectRef.current;
    const source = structuredClone(currentProject);
    const topologyRepair = repairProjectTopology(source);
    const topologyRepairCount = topologyRepair.mergedNodes.length + topologyRepair.splitMembers.length;
    if (topologyRepairCount > 0) {
      setPast((history) => [...history.slice(-49), currentProject]);
      setFuture([]);
      projectRef.current = source;
      setProject(source);
      setPersistenceRevision((revision) => revision + 1);
      const selected = selectionRef.current;
      if (selected?.kind === 'node') {
        const merge = topologyRepair.mergedNodes.find((item) => item.removedNodeId === selected.id);
        if (merge) setSelection({ kind: 'node', id: merge.keptNodeId });
      }
    }
    const requestRevision = analysisRevisionRef.current + 1;
    analysisRevisionRef.current = requestRevision;
    setIsAnalyzing(true);
    const complete = (nextResult: AnalysisResult) => {
      if (analysisRevisionRef.current !== requestRevision) return;
      const next = topologyRepairCount > 0 ? {
        ...nextResult,
        issues: [{
          id: 'topology-auto-repair',
          severity: 'info' as const,
          title: 'Topología conectada automáticamente',
          message: `Se ${topologyRepair.mergedNodes.length === 1 ? 'unió 1 par de nodos' : `unieron ${topologyRepair.mergedNodes.length} pares de nodos`} y se ${topologyRepair.splitMembers.length === 1 ? 'dividió 1 miembro' : `dividieron ${topologyRepair.splitMembers.length} miembros`} para que los apoyos y cruces coincidentes participen en el análisis.`,
          suggestedFix: 'Revisa la geometría reparada; puedes deshacerla desde el historial si la coincidencia era intencional.',
        }, ...nextResult.issues],
      } : nextResult;
      setAnalysis(next);
      setIsAnalyzing(false);
      if (!next.success) setResultTab('issues');
      else if (selectionRef.current?.kind !== 'member' && next.memberResults.length) {
        const critical = next.memberResults.reduce((best, current) => {
          const bestValue = Math.max(Math.abs(best.maxMoment), Math.abs(best.minMoment));
          const currentValue = Math.max(Math.abs(current.maxMoment), Math.abs(current.minMoment));
          return currentValue > bestValue ? current : best;
        });
        setSelection({ kind: 'member', id: critical.memberId });
      }
    };
    // A run that never produced numbers still has to reach the user: leaving
    // `isAnalyzing` set would freeze the UI on "analysing" with no explanation.
    const fail = (message: string) => complete(unavailableAnalysis(message));
    const runFallback = () => {
      analysisTimerRef.current = window.setTimeout(() => {
        analysisTimerRef.current = null;
        void runFallbackAnalysis(source, selectedCombinationId)
          .then(complete)
          .catch((error: unknown) => fail(error instanceof Error ? error.message : 'No se pudo completar el análisis estructural.'));
      }, 0);
    };
    if (typeof Worker === 'undefined') {
      runFallback();
      return;
    }
    try {
      const worker = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
      analysisWorkerRef.current = worker;
      let settled = false;
      const fallbackOnce = () => {
        if (settled || analysisRevisionRef.current !== requestRevision) return;
        settled = true;
        worker.terminate();
        if (analysisWorkerRef.current === worker) analysisWorkerRef.current = null;
        runFallback();
      };
      worker.onmessage = (event: MessageEvent<AnalysisWorkerResponse>) => {
        if (settled || event.data.requestId !== requestRevision) return;
        settled = true;
        worker.terminate();
        if (analysisWorkerRef.current === worker) analysisWorkerRef.current = null;
        // `analysis-error` is a decision taken by the same pure function the
        // fallback would call, so recomputing it on the main thread would only
        // block the UI to reach the identical failure and hide its message.
        if (event.data.type === 'analysis-result') complete(event.data.result);
        else fail(event.data.message);
      };
      worker.onerror = fallbackOnce;
      const request: AnalysisWorkerRequest = { type: 'analyze', requestId: requestRevision, project: source, combinationId: selectedCombinationId || null };
      worker.postMessage(request);
    } catch {
      runFallback();
    }
  }, [selectedCombinationId, setSelection]);

  const setSelectedCombinationId = useCallback((id: string) => {
    if (id === selectedCombinationId) return;
    invalidateAnalysis();
    setSelectedCombinationIdState(id);
  }, [invalidateAnalysis, selectedCombinationId]);

  const renameProject = useCallback((name: string) => {
    const current = projectRef.current;
    if (name === current.name) return;
    const next = { ...current, name };
    projectRef.current = next;
    setProject(next);
  }, []);

  const updateProject = useCallback((updater: (project: ProjectModel) => ProjectModel, analyzeAfter = false) => {
    const current = projectRef.current;
    const next = updater(structuredClone(current));
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    setPast((history) => [...history.slice(-49), current]);
    setFuture([]);
    invalidateAnalysis();
    projectRef.current = next;
    setProject(next);
    if (analyzeAfter) {
      // `invalidateAnalysis` above already bumped the revision; publishing this
      // run without re-checking it would let a result from an older model land
      // on top of a newer edit.
      const requestRevision = analysisRevisionRef.current;
      window.setTimeout(() => {
        void runFallbackAnalysis(next, selectedCombinationId)
          .then((result) => { if (analysisRevisionRef.current === requestRevision) setAnalysis(result); })
          .catch((error: unknown) => {
            if (analysisRevisionRef.current !== requestRevision) return;
            setAnalysis(unavailableAnalysis(error instanceof Error ? error.message : 'No se pudo completar el análisis estructural.'));
          });
      }, 0);
    }
  }, [invalidateAnalysis, selectedCombinationId]);

  const updateProjectView = useCallback((updater: (project: ProjectModel) => ProjectModel) => {
    const current = projectRef.current;
    const next = updater(structuredClone(current));
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    projectRef.current = next;
    setProject(next);
  }, []);

  const beginProjectTransaction = useCallback(() => {
    if (transactionStartRef.current) return;
    transactionStartRef.current = structuredClone(projectRef.current);
    setTransactionActive(true);
  }, []);

  const updateProjectTransient = useCallback((updater: (project: ProjectModel) => ProjectModel) => {
    const current = projectRef.current;
    const next = updater(structuredClone(current));
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    projectRef.current = next;
    invalidateAnalysis();
    setProject(next);
  }, [invalidateAnalysis]);

  const moveNodeTransient = useCallback((nodeId: string, point: { x: number; y: number }) => {
    const current = projectRef.current;
    const index = current.nodes.findIndex((node) => node.id === nodeId);
    if (index < 0) return;
    const node = current.nodes[index];
    if (node.x === point.x && node.y === point.y) return;
    const nodes = current.nodes.slice();
    nodes[index] = { ...node, x: point.x, y: point.y };
    const next = { ...current, nodes };
    projectRef.current = next;
    invalidateAnalysis();
    setProject(next);
  }, [invalidateAnalysis]);

  const commitProjectTransaction = useCallback(() => {
    const start = transactionStartRef.current;
    transactionStartRef.current = null;
    if (start && JSON.stringify(start) !== JSON.stringify(projectRef.current)) {
      setPast((history) => [...history.slice(-49), start]);
      setFuture([]);
    }
    setTransactionActive(false);
    setPersistenceRevision((revision) => revision + 1);
  }, []);

  const cancelProjectTransaction = useCallback(() => {
    const start = transactionStartRef.current;
    transactionStartRef.current = null;
    if (start) {
      projectRef.current = start;
      setProject(start);
      invalidateAnalysis();
    }
    setTransactionActive(false);
    setPersistenceRevision((revision) => revision + 1);
  }, [invalidateAnalysis]);

  const replaceProject = useCallback((next: ProjectModel, restoredAnalysis?: AnalysisResult) => {
    const normalized = normalizeProject(next);
    setPast((history) => [...history.slice(-49), project]);
    setFuture([]);
    setProject(normalized);
    projectRef.current = normalized;
    invalidateAnalysis();
    if (restoredAnalysis) {
      setAnalysis(restoredAnalysis);
      setResultTab(restoredAnalysis.success ? 'summary' : 'issues');
    }
    setActiveTool('select');
    setSelectedCombinationIdState((current) => normalized.combinations.some((item) => item.id === current) ? current : '');
    setSelection(null);
    setResultCursor(null);
  }, [invalidateAnalysis, project, setSelection]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture((items) => [project, ...items].slice(0, 50));
    setPast(past.slice(0, -1));
    setProject(previous);
    projectRef.current = previous;
    invalidateAnalysis();
    setSelection(null);
  }, [invalidateAnalysis, past, project, setSelection]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const normalized = normalizeProject(future[0]);
    setPast((history) => [...history.slice(-49), project]);
    setFuture(future.slice(1));
    setProject(normalized);
    projectRef.current = normalized;
    invalidateAnalysis();
    setSelection(null);
  }, [future, invalidateAnalysis, project, setSelection]);

  const value = useMemo<ProjectContextValue>(() => ({
    project, analysis, activeTool, selection, theme, resultTab, selectedCombinationId, isAnalyzing, learningFocus, resultCursor, influenceCanvasState,
    canUndo: past.length > 0, canRedo: future.length > 0,
    storageIssue: storageState.issue, storageMessage: storageState.message,
    setActiveTool, setSelection, setTheme, setResultTab, setSelectedCombinationId, setLearningFocus, setResultCursor, setInfluenceCanvasState, renameProject,
    updateProject, updateProjectView, beginProjectTransaction, updateProjectTransient, moveNodeTransient, commitProjectTransaction, cancelProjectTransaction,
    replaceProject, undo, redo, analyze, clearAnalysis: invalidateAnalysis,
  }), [project, analysis, activeTool, selection, theme, resultTab, selectedCombinationId, isAnalyzing, learningFocus, resultCursor, influenceCanvasState, past.length, future.length, storageState.issue, storageState.message, setSelection, setSelectedCombinationId, renameProject, updateProject, updateProjectView, beginProjectTransaction, updateProjectTransient, moveNodeTransient, commitProjectTransaction, cancelProjectTransaction, replaceProject, undo, redo, analyze, invalidateAnalysis]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components
export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject debe utilizarse dentro de ProjectProvider.');
  return context;
};
