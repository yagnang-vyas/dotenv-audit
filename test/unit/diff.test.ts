import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diff } from '../../src/diff.js';
import type { SourceFile } from '../../src/types.js';

const file = (name: string): SourceFile => {
  const path = `test/fixtures/diff/${name}`;
  return { path, text: readFileSync(path, 'utf8') };
};

describe('diff', () => {
  const staging = file('staging.env');
  const production = file('production.env');

  it('reports keys only in one file and differing values', () => {
    const result = diff(staging, production);
    expect(result.counts).toEqual({ onlyInA: 1, onlyInB: 1, different: 2, identical: 2 });
    expect(
      result.findings.map(
        (f) => `${f.file}:${String(f.line)} ${f.id} ${f.severity} ${String(f.key)}: ${f.message}`,
      ),
    ).toEqual([
      'test/fixtures/diff/production.env:6 ENV010 warning PRODUCTION_ONLY: key is missing from test/fixtures/diff/staging.env',
      'test/fixtures/diff/staging.env:2 ENV011 note APP_URL: value differs from test/fixtures/diff/production.env (line 2)',
      'test/fixtures/diff/staging.env:3 ENV011 note API_TOKEN: value differs from test/fixtures/diff/production.env (line 3)',
      'test/fixtures/diff/staging.env:6 ENV010 warning STAGING_ONLY: key is missing from test/fixtures/diff/production.env',
    ]);
  });

  it('never includes values', () => {
    const json = JSON.stringify(diff(staging, production));
    for (const value of [
      'fake-staging-token-111',
      'fake-production-token-222',
      'staging.example.test',
    ]) {
      expect(json).not.toContain(value);
    }
  });

  it('reports identical files as clean', () => {
    expect(diff(staging, staging)).toEqual({
      findings: [],
      counts: { onlyInA: 0, onlyInB: 0, different: 0, identical: 5 },
    });
  });

  it('includes parse problems from both files', () => {
    const result = diff({ path: 'a', text: 'A=1\nA=2' }, { path: 'b', text: 'A=2\nbad line' });
    expect(result.findings.map((f) => `${f.file}:${String(f.line)} ${f.id}`)).toEqual([
      'a:2 ENV005',
      'b:2 ENV006',
    ]);
    expect(result.counts.identical).toBe(1);
  });
});
