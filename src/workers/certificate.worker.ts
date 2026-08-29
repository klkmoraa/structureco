/// <reference lib="webworker" />
import { handleCertificateEnvelope } from '../runtime/workerHandlers';
import type { CertificateWorkerPayload, WorkerRequestEnvelope } from '../runtime/workerProtocol';

self.onmessage = (event: MessageEvent<WorkerRequestEnvelope<'certificate', CertificateWorkerPayload>>) => {
  self.postMessage(handleCertificateEnvelope(event.data));
};

export {};
