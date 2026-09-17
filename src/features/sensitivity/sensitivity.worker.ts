/// <reference lib="webworker" />
import { runSensitivityStudy, type SensitivityStudyResult } from './sensitivity';
import type { LoadCombination, ProjectModel } from '../../types';
import type { SensitivityParameter } from './sensitivity';

interface SensitivityWorkerInput {
  project: ProjectModel;
  combination: LoadCombination | null;
  memberId: string;
  parameter: SensitivityParameter;
  percent: number;
}

interface SensitivityWorkerRequest { requestId: number; input: SensitivityWorkerInput }
interface SensitivityWorkerResponse { requestId: number; result?: SensitivityStudyResult; error?: string }

self.onmessage = (event: MessageEvent<SensitivityWorkerRequest>) => {
  try {
    const { requestId, input } = event.data;
    self.postMessage({ requestId, result: runSensitivityStudy(input.project, input.combination, input.memberId, input.parameter, input.percent) } satisfies SensitivityWorkerResponse);
  } catch (error) {
    self.postMessage({ requestId: event.data.requestId, error: error instanceof Error ? error.message : 'No se pudo completar el estudio de sensibilidad.' } satisfies SensitivityWorkerResponse);
  }
};

export {};
