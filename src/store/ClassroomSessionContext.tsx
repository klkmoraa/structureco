import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DiagramQuantity } from '../types';

export type ClassroomRevealState = 'hidden' | 'predicting' | 'revealed';
export type ClassroomPredictions = Record<string, Partial<Record<DiagramQuantity, number>>>;

export interface ClassroomSessionContextValue {
  revealState: ClassroomRevealState;
  predictions: ClassroomPredictions;
  resultsVisible: boolean;
  setRevealState: (state: ClassroomRevealState) => void;
  hideResults: () => void;
  startPredicting: () => void;
  revealResults: () => void;
  setPrediction: (memberId: string, quantity: DiagramQuantity, value: number | null) => void;
  clearPredictions: () => void;
}

const ClassroomSessionContext = createContext<ClassroomSessionContextValue | null>(null);

export interface ClassroomSessionProviderProps {
  projectId: string;
  children: ReactNode;
  initialRevealState?: ClassroomRevealState;
}

export const ClassroomSessionProvider = ({
  projectId,
  children,
  initialRevealState = 'hidden',
}: ClassroomSessionProviderProps) => {
  const [revealState, setRevealState] = useState<ClassroomRevealState>(initialRevealState);
  const [predictions, setPredictions] = useState<ClassroomPredictions>({});

  useEffect(() => {
    setRevealState(initialRevealState);
    setPredictions({});
  }, [initialRevealState, projectId]);

  const hideResults = useCallback(() => setRevealState('hidden'), []);
  const startPredicting = useCallback(() => setRevealState('predicting'), []);
  const revealResults = useCallback(() => setRevealState('revealed'), []);
  const clearPredictions = useCallback(() => setPredictions({}), []);
  const setPrediction = useCallback((memberId: string, quantity: DiagramQuantity, value: number | null) => {
    if (!memberId.trim()) return;
    setPredictions((current) => {
      const memberPrediction = current[memberId] ?? {};
      if (value === null || !Number.isFinite(value)) {
        if (memberPrediction[quantity] === undefined) return current;
        const nextMember = { ...memberPrediction };
        delete nextMember[quantity];
        const next = { ...current };
        if (Object.keys(nextMember).length) next[memberId] = nextMember;
        else delete next[memberId];
        return next;
      }
      if (memberPrediction[quantity] === value) return current;
      return {
        ...current,
        [memberId]: { ...memberPrediction, [quantity]: value },
      };
    });
  }, []);

  const value = useMemo<ClassroomSessionContextValue>(() => ({
    revealState,
    predictions,
    resultsVisible: revealState === 'revealed',
    setRevealState,
    hideResults,
    startPredicting,
    revealResults,
    setPrediction,
    clearPredictions,
  }), [clearPredictions, hideResults, predictions, revealResults, revealState, setPrediction, startPredicting]);

  return <ClassroomSessionContext.Provider value={value}>{children}</ClassroomSessionContext.Provider>;
};

// oxlint-disable-next-line react/only-export-components
export const useClassroomSession = () => {
  const context = useContext(ClassroomSessionContext);
  if (!context) throw new Error('useClassroomSession debe utilizarse dentro de ClassroomSessionProvider.');
  return context;
};
