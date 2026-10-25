import { runAudit, type AuditOutcome, type AuditRequest } from './audit.ts';

/** An audit that has not finished by then is stopped. */
export const AUDIT_TIMEOUT_MS = 5000;

interface Pending {
  id: number;
  resolve: (outcome: AuditOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs audits in a dedicated Web Worker when the browser supports it, and
 * synchronously otherwise (for example in tests). Everything stays on the
 * device: the worker is bundled with the site and makes no requests.
 */
export class AuditClient {
  private worker: Worker | null = null;
  private pending: Pending | null = null;
  private nextId = 1;

  run(request: AuditRequest): Promise<AuditOutcome> {
    if (typeof Worker === 'undefined') return Promise.resolve(runAudit(request));
    // A newer run supersedes an unfinished one; restart rather than queue behind it.
    if (this.pending !== null) this.reset();
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.reset();
        resolve({
          status: 'usage-error',
          mode: request.mode,
          command: '',
          message: `the audit did not finish within ${AUDIT_TIMEOUT_MS / 1000} seconds (a schema pattern may be too slow); try the CLI`,
        });
      }, AUDIT_TIMEOUT_MS);
      this.pending = { id, resolve, timer };
      worker.postMessage({ id, request });
    });
  }

  dispose(): void {
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
  }

  private ensureWorker(): Worker {
    if (this.worker !== null) return this.worker;
    const worker = new Worker(new URL('./audit.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; outcome: AuditOutcome }>) => {
      const pending = this.pending;
      if (pending === null || pending.id !== event.data.id) return;
      clearTimeout(pending.timer);
      this.pending = null;
      pending.resolve(event.data.outcome);
    };
    worker.onerror = (event) => {
      // Never surface the raw error: its message could quote input.
      event.preventDefault();
      const pending = this.pending;
      this.reset();
      pending?.resolve({
        status: 'usage-error',
        mode: 'check',
        command: '',
        message: 'unexpected internal error',
      });
    };
    this.worker = worker;
    return worker;
  }

  /** Drops a superseded request; its promise is never resolved. */
  private cancel(): void {
    if (this.pending === null) return;
    clearTimeout(this.pending.timer);
    this.pending = null;
  }

  private reset(): void {
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
  }
}
