export interface ReviewPassBusy {
  analysis: boolean;
  comparison: boolean;
  certificate: boolean;
}

export interface ReviewPassFailures {
  analysis: boolean;
  comparison: boolean;
  certificate: boolean;
}

export interface ReviewPassBinding {
  projectId: string;
  analysisSignature: string;
  combinationId: string;
}

export type ReviewPassState = 'idle' | 'running' | 'complete' | 'failed';

export interface ReviewPassExecutors {
  analyze: () => void;
  compare: () => void;
  certificate: () => void;
}

export const isReviewPassBindingCurrent = (passBinding: ReviewPassBinding | null, currentBinding: ReviewPassBinding): boolean => (
  passBinding === null
  || passBinding.projectId === currentBinding.projectId
  && passBinding.analysisSignature === currentBinding.analysisSignature
  && passBinding.combinationId === currentBinding.combinationId
);

export const resolveReviewPassState = (requested: boolean, busy: ReviewPassBusy, failures: ReviewPassFailures): ReviewPassState => {
  if (busy.analysis || busy.comparison || busy.certificate) return 'running';
  if (!requested) return 'idle';
  return failures.analysis || failures.comparison || failures.certificate ? 'failed' : 'complete';
};

export const startReviewPass = ({ analyze, compare, certificate }: ReviewPassExecutors): ReviewPassFailures => {
  const failures: ReviewPassFailures = { analysis: false, comparison: false, certificate: false };
  const steps: Array<[keyof ReviewPassFailures, () => void]> = [
    ['analysis', analyze],
    ['comparison', compare],
    ['certificate', certificate],
  ];
  steps.forEach(([step, executor]) => {
    try {
      executor();
    } catch {
      failures[step] = true;
    }
  });
  return failures;
};
