import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { check } from '../../src/check.js';
import { loadSchemaFile, parseSchema } from '../../src/schema.js';
import type { Finding, SourceFile } from '../../src/types.js';

const dir = 'test/fixtures/check';
const file = (name: string): SourceFile => ({
  path: `${dir}/${name}`,
  text: readFileSync(`${dir}/${name}`, 'utf8'),
});
const inline = (path: string, text: string): SourceFile => ({ path, text });
const summary = (findings: Finding[]): string[] =>
  findings.map((f) => `${f.id} ${f.severity} ${String(f.line)} ${String(f.key)}: ${f.message}`);

describe('check fixtures', () => {
  it('passes a valid env against the example and the schema', async () => {
    const schema = await loadSchemaFile(`${dir}/env.schema.json`);
    expect(check({ env: file('valid.env'), example: file('example.env'), schema })).toEqual([]);
  });

  it('reports every check finding for the broken env against the example', () => {
    expect(summary(check({ env: file('broken.env'), example: file('example.env') }))).toEqual([
      'ENV001 error null ADMIN_EMAIL: required key is missing',
      'ENV001 error null WORKERS: required key is missing',
      'ENV003 error 4 NODE_ENV: required key has an empty value',
      'ENV005 warning 6 API_KEY: duplicate key (also set on line 5); the last value wins',
      'ENV009 error 6 API_KEY: placeholder value for a secret-looking key',
      'ENV002 warning 7 EXTRA_SETTING: key is not defined in the example file',
      'ENV006 error 8 null: line is not a valid KEY=value assignment',
      'ENV002 warning 9 DB_PASSWORD: key is not defined in the example file',
      'ENV009 error 9 DB_PASSWORD: placeholder value for a secret-looking key',
    ]);
  });

  it('reports schema findings for the broken env', async () => {
    const schema = await loadSchemaFile(`${dir}/env.schema.json`);
    expect(summary(check({ env: file('broken.env'), schema }))).toEqual([
      'ENV001 error null ADMIN_EMAIL: required key is missing',
      'ENV001 error null WORKERS: required key is missing',
      'ENV004 error 2 DATABASE_URL: expected a URL with protocol postgres or postgresql',
      'ENV004 error 3 PORT: expected an integer between 1 and 65535',
      'ENV003 error 4 NODE_ENV: required key has an empty value',
      'ENV004 error 6 API_KEY: expected at least 20 characters',
      'ENV005 warning 6 API_KEY: duplicate key (also set on line 5); the last value wins',
      'ENV009 error 6 API_KEY: placeholder value for a secret-looking key',
      'ENV002 error 7 EXTRA_SETTING: key is not defined in the schema',
      'ENV006 error 8 null: line is not a valid KEY=value assignment',
      'ENV009 error 9 DB_PASSWORD: placeholder value for a secret-looking key',
    ]);
  });
});

describe('check rules', () => {
  const schema = (variables: unknown, allowUnknown?: boolean): ReturnType<typeof parseSchema> =>
    parseSchema(
      JSON.stringify({ variables, ...(allowUnknown === undefined ? {} : { allowUnknown }) }),
      's',
    );

  it('treats every example key as required', () => {
    const findings = check({
      env: inline('.env', 'A=1'),
      example: inline('.env.example', 'A=\nB='),
    });
    expect(summary(findings)).toEqual(['ENV001 error null B: required key is missing']);
  });

  it('does not report optional schema keys that are missing or empty', () => {
    const s = schema({
      PORT: { type: 'port', required: false },
      DEBUG: { type: 'boolean', required: false },
    });
    expect(check({ env: inline('.env', 'DEBUG='), schema: s })).toEqual([]);
  });

  it('lets the schema make an example key optional', () => {
    const s = schema({ B: { type: 'string', required: false } });
    const findings = check({
      env: inline('.env', 'A=1'),
      example: inline('.env.example', 'A=\nB='),
      schema: s,
    });
    expect(findings).toEqual([]);
  });

  it('treats keys from either source as known', () => {
    const findings = check({
      env: inline('.env', 'A=1\nB=2\nC=3'),
      example: inline('.env.example', 'A='),
      schema: schema({ B: { type: 'string' } }, false),
    });
    expect(summary(findings)).toEqual([
      'ENV002 error 3 C: key is not defined in the example file or the schema',
    ]);
  });

  it('reports unknown schema keys as warnings unless allowUnknown is false', () => {
    const findings = check({ env: inline('.env', 'C=3'), schema: schema({}) });
    expect(summary(findings)).toEqual(['ENV002 warning 1 C: key is not defined in the schema']);
  });

  it('does not report a missing key when its line failed to parse', () => {
    const findings = check({ env: inline('.env', 'A="unterminated'), example: inline('x', 'A=') });
    expect(summary(findings)).toEqual(['ENV006 error 1 A: unterminated quoted value']);
  });

  it('reports parse problems in the example file against that file', () => {
    const findings = check({ env: inline('.env', 'A=1'), example: inline('ex', 'A=\nnot valid') });
    expect(findings).toEqual([
      {
        id: 'ENV006',
        severity: 'error',
        file: 'ex',
        line: 2,
        key: null,
        message: 'line is not a valid KEY=value assignment',
      },
    ]);
  });

  it('checks placeholders in unknown keys too, but never in the example', () => {
    const findings = check({
      env: inline('.env', 'A=1\nGITHUB_TOKEN=todo'),
      example: inline('.env.example', 'A=\nSECRET_KEY=changeme'),
    });
    expect(summary(findings)).toEqual([
      'ENV001 error null SECRET_KEY: required key is missing',
      'ENV002 warning 2 GITHUB_TOKEN: key is not defined in the example file',
      'ENV009 error 2 GITHUB_TOKEN: placeholder value for a secret-looking key',
    ]);
  });

  it('uses the schema secret flag for placeholder detection', () => {
    const s = schema({ STRIPE: { type: 'string', secret: true }, PLAIN: { type: 'string' } });
    const findings = check({ env: inline('.env', 'STRIPE=xxxx\nPLAIN=changeme'), schema: s });
    expect(summary(findings)).toEqual([
      'ENV009 error 1 STRIPE: placeholder value for a secret-looking key',
    ]);
  });

  it('never includes values in findings', async () => {
    const findings = check({
      env: file('broken.env'),
      example: file('example.env'),
      schema: await loadSchemaFile(`${dir}/env.schema.json`),
    });
    expect(JSON.stringify(findings)).not.toContain('fake-secret-value-123');
    expect(JSON.stringify(findings)).not.toContain('three-thousand');
  });
});
