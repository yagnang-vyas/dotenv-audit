import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditRequest } from './audit.ts';
import { AUDIT_TIMEOUT_MS, AuditClient } from './client.ts';

const request: AuditRequest = {
  mode: 'check',
  env: { name: '.env', text: 'A=1\n' },
  example: { name: '.env.example', text: 'A=\n' },
  schema: null,
  failOn: 'error',
};

/** A stand-in Worker that answers by running the handler synchronously, or never. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static respond = true;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(data: { id: number; request: AuditRequest }): void {
    if (!FakeWorker.respond) return;
    void import('./audit.ts').then(({ runAudit }) => {
      this.onmessage?.({ data: { id: data.id, outcome: runAudit(data.request) } } as MessageEvent);
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.useRealTimers();
  FakeWorker.instances = [];
  FakeWorker.respond = true;
});

describe('AuditClient', () => {
  it('runs synchronously when Web Workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const outcome = await new AuditClient().run(request);
    expect(outcome.status).toBe('completed');
  });

  it('runs audits in a worker', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const client = new AuditClient();
    const outcome = await client.run(request);
    expect(outcome).toMatchObject({ status: 'completed', summary: { errors: 0 } });
    expect(FakeWorker.instances).toHaveLength(1);
    client.dispose();
    expect(FakeWorker.instances[0]?.terminated).toBe(true);
  });

  it('stops a worker that does not answer in time', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    FakeWorker.respond = false;
    const client = new AuditClient();
    const pending = client.run(request);
    vi.advanceTimersByTime(AUDIT_TIMEOUT_MS);
    const outcome = await pending;
    expect(outcome.status).toBe('usage-error');
    expect(outcome.status === 'usage-error' && outcome.message).toMatch(/did not finish/);
    expect(FakeWorker.instances[0]?.terminated).toBe(true);
  });

  it('reports a crashed worker without its error message', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    FakeWorker.respond = false;
    const client = new AuditClient();
    const pending = client.run(request);
    FakeWorker.instances[0]?.onerror?.({
      message: 'SECRET_MARKER',
      preventDefault: () => undefined,
    } as ErrorEvent);
    await expect(pending).resolves.toMatchObject({ message: 'unexpected internal error' });
  });
});
