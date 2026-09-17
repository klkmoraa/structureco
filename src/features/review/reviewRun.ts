export interface ReviewPassBusy {
  analysis: boolean;
  comparison: boolean;
  certificate: boolean;
}

export type ReviewPassState = 'idle' | 'running' | 'complete';

export interface ReviewPassExecutors {
  analyze: () => void;
  compare: () => void;
  certificate: () => void;
}

export const resolveReviewPassState = (requested: boolean, busy: ReviewPassBusy): ReviewPassState => {
  if (!requested) return 'idle';
  return busy.analysis || busy.comparison || busy.certificate ? 'running' : 'complete';
};

export const startReviewPass = ({ analyze, compare, certificate }: ReviewPassExecutors): void => {
  analyze();
  compare();
  certificate();
};
