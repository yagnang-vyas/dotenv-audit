// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exitCode as cliExitCode } from '@core/cli.ts';
import type { Finding } from '@core/types.ts';
import { FINDINGS } from '../content/findings.ts';
import {
  cliCommand,
  exitCode,
  MAX_INPUT_BYTES,
  runAudit,
  type AuditOutcome,
  type CompletedAudit,
} from './audit.ts';

const repo = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const brokenEnv = { name: '.env.sample-broken', text: repo('examples/.env.sample-broken') };
const exampleEnv = { name: '.env.example', text: repo('examples/.env.example') };
const schema = { name: 'env.schema.json', text: repo('examples/env.schema.json') };

/** Extracts the output of a `$ dotenv-audit …` console block from the README. */
function readmeOutput(command: string): string {
  const readme = repo('README.md');
  const start = readme.indexOf(`$ ${command}\n`);
  if (start === -1) throw new Error(`README has no block for: ${command}`);
  const body = readme.slice(start + command.length + 3);
  return body.slice(0, body.indexOf('```'));
}

function completed(outcome: AuditOutcome): CompletedAudit {
  if (outcome.status !== 'completed') throw new Error(`audit failed: ${outcome.message}`);
  return outcome;
}

describe('runAudit matches the CLI output documented in the README', () => {
  it('check against the example file', () => {
    const audit = completed(
      runAudit({
        mode: 'check',
        env: brokenEnv,
        example: exampleEnv,
        schema: null,
        failOn: 'error',
      }),
    );
    expect(audit.textReport).toBe(readmeOutput('dotenv-audit check --env .env.sample-broken'));
    expect(audit.exitCode).toBe(1);
  });

  it('check against the schema', () => {
    const audit = completed(
      runAudit({ mode: 'check', env: brokenEnv, example: null, schema, failOn: 'error' }),
    );
    expect(audit.textReport).toBe(
      readmeOutput('dotenv-audit check --env .env.sample-broken --schema env.schema.json'),
    );
    expect(audit.command).toBe(
      'dotenv-audit check --env .env.sample-broken --schema env.schema.json',
    );
  });

  it('diff', () => {
    const audit = completed(
      runAudit({ mode: 'diff', a: exampleEnv, b: brokenEnv, failOn: 'error' }),
    );
    expect(audit.textReport).toBe(
      readmeOutput('dotenv-audit diff .env.example .env.sample-broken'),
    );
    expect(audit.diff?.counts).toEqual({ onlyInA: 2, onlyInB: 1, different: 5, identical: 0 });
  });

  it('JSON report', () => {
    const audit = completed(
      runAudit({ mode: 'check', env: exampleEnv, example: null, schema, failOn: 'error' }),
    );
    expect(audit.jsonReport).toBe(
      readmeOutput('dotenv-audit check --env .env.example --schema env.schema.json --format json'),
    );
  });
});

describe('diff rows', () => {
  it('classifies every key without carrying values', () => {
    const audit = completed(
      runAudit({
        mode: 'diff',
        a: { name: 'a.env', text: 'SAME=1\nCHANGED=x\nONLY_A=1\n' },
        b: { name: 'b.env', text: 'ONLY_B=1\nSAME=1\nCHANGED=y\n' },
        failOn: 'error',
      }),
    );
    expect(audit.diff?.rows).toEqual([
      { key: 'CHANGED', status: 'different', lineA: 2, lineB: 3 },
      { key: 'ONLY_A', status: 'only-a', lineA: 3, lineB: null },
      { key: 'ONLY_B', status: 'only-b', lineA: null, lineB: 1 },
      { key: 'SAME', status: 'identical', lineA: 1, lineB: 2 },
    ]);
    expect(audit.files).toEqual([
      { name: 'a.env', keys: 3 },
      { name: 'b.env', keys: 3 },
    ]);
  });
});

describe('usage errors', () => {
  const env = { name: '.env', text: 'A=1\n' };

  it('requires an example file or a schema', () => {
    const outcome = runAudit({ mode: 'check', env, example: null, schema: null, failOn: 'error' });
    expect(outcome).toMatchObject({ status: 'usage-error' });
  });

  it('reports invalid schema JSON without echoing it', () => {
    const outcome = runAudit({
      mode: 'check',
      env,
      example: null,
      schema: { name: 'env.schema.json', text: '{"variables": SECRET_MARKER' },
      failOn: 'error',
    });
    expect(outcome).toEqual({
      status: 'usage-error',
      mode: 'check',
      command: 'dotenv-audit check --env .env --schema env.schema.json',
      message: 'env.schema.json: invalid JSON',
    });
  });

  it('names the JSON path of a schema mistake', () => {
    const outcome = runAudit({
      mode: 'check',
      env,
      example: null,
      schema: { name: 's.json', text: '{"variables":{"PORT":{"type":"port","min":1}}}' },
      failOn: 'error',
    });
    expect(outcome).toMatchObject({
      message: 's.json: $.variables.PORT.min: unknown property for type "port"',
    });
  });

  it('needs distinct file names for diff', () => {
    const outcome = runAudit({ mode: 'diff', a: env, b: env, failOn: 'error' });
    expect(outcome).toMatchObject({ status: 'usage-error' });
  });

  it('rejects unsafe file names and oversized input', () => {
    expect(
      runAudit({ mode: 'diff', a: { name: 'a b', text: '' }, b: env, failOn: 'error' }),
    ).toMatchObject({ status: 'usage-error' });
    const large = { name: '.env', text: 'A'.repeat(MAX_INPUT_BYTES + 1) };
    expect(
      runAudit({ mode: 'check', env: large, example: env, schema: null, failOn: 'error' }),
    ).toMatchObject({
      status: 'usage-error',
      message: '.env is larger than 256 KiB; use the CLI for large files',
    });
  });
});

describe('exitCode', () => {
  const findings = (...severities: Finding['severity'][]): Finding[] =>
    severities.map((severity) => ({
      id: 'ENV002',
      severity,
      file: 'f',
      line: 1,
      key: 'K',
      message: 'm',
    }));

  it('matches the CLI for every severity mix and threshold', () => {
    const cases = [findings(), findings('note'), findings('warning'), findings('error', 'note')];
    for (const list of cases) {
      for (const failOn of ['error', 'warning', 'never'] as const) {
        expect(exitCode(list, failOn)).toBe(cliExitCode(list, failOn));
      }
    }
  });
});

describe('cliCommand', () => {
  it('builds the equivalent command line', () => {
    expect(
      cliCommand({
        mode: 'check',
        env: { name: '.env', text: '' },
        example: { name: '.env.example', text: '' },
        schema: null,
        failOn: 'warning',
      }),
    ).toBe('dotenv-audit check --env .env --example .env.example --fail-on warning');
  });
});

describe('finding catalogue', () => {
  it('documents every finding ID the engine defines, with README severities', () => {
    const readme = repo('README.md');
    expect(FINDINGS.map((info) => info.id)).toEqual(
      Array.from({ length: 11 }, (_, index) => `ENV${String(index + 1).padStart(3, '0')}`),
    );
    for (const info of FINDINGS) {
      expect(readme).toMatch(new RegExp(`\\| ${info.id} \\| ${info.severity}\\s+\\|`));
    }
  });
});
