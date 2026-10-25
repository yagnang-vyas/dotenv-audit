/**
 * Runs audits off the main thread so a slow schema pattern cannot freeze the
 * page; the client terminates this worker if it takes too long. The worker has
 * no network code and never logs.
 */
import { runAudit, type AuditRequest } from './audit.ts';

interface Envelope {
  id: number;
  request: AuditRequest;
}

/** The members of DedicatedWorkerGlobalScope used here (the DOM lib types `self` as Window). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<Envelope>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<Envelope>) => {
  const { id, request } = event.data;
  scope.postMessage({ id, outcome: runAudit(request) });
};
