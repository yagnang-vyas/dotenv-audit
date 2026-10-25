import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { git, isolateGit, tempRepo } from '../git.js';

/**
 * The core promise: no value from an env file ever reaches stdout or stderr.
 * Every fixture value in test/fixtures/privacy contains this marker.
 */
const MARKER = 'fake-secret-value';
const cli = resolve('dist/cli.js');
const dir = resolve('test/fixtures/privacy');
const secrets = join(dir, 'secrets.env');
const other = join(dir, 'other.env');
const example = join(dir, 'example.env');
const schema = join(dir, 'schema.json');

const commands: Record<string, string[]> = {
  'check with example': ['check', '--env', secrets, '--example', example],
  'check with schema': ['check', '--env', secrets, '--schema', schema],
  'check with example and schema': [
    'check',
    '--env',
    secrets,
    '--example',
    example,
    '--schema',
    schema,
  ],
  'check with a secret-filled example': ['check', '--env', other, '--example', secrets],
  'diff A to B': ['diff', secrets, other],
  'diff B to A': ['diff', other, secrets],
  'invalid schema JSON containing values': ['check', '--env', secrets, '--schema', secrets],
  'env file passed as a directory': ['check', '--env', dir, '--example', secrets],
};

const variants: Record<string, string[]> = {
  text: [],
  'text quiet': ['--quiet'],
  json: ['--format', 'json'],
  'json fail-on warning': ['--format', 'json', '--fail-on', 'warning'],
};

beforeAll(isolateGit);

function run(args: string[], cwd?: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe('privacy: values never appear in output', () => {
  const cases = Object.entries(commands).flatMap(([command, args]) =>
    Object.entries(variants).map(
      ([variant, extra]) => [`${command} (${variant})`, [...args, ...extra]] as const,
    ),
  );

  it.each(cases)('%s', (_name, args) => {
    const { status, output } = run([...args]);
    expect([1, 2]).toContain(status);
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain(MARKER);
  });

  it.each(Object.entries(variants))('scan (%s)', (_name, extra) => {
    const repo = tempRepo();
    copyFileSync(secrets, join(repo, '.env'));
    copyFileSync(secrets, join(repo, '.env.production'));
    git(repo, 'add', '-f', '.');
    const { status, output } = run(['scan', ...extra], repo);
    expect(status).toBe(1);
    expect(output).toContain('ENV007');
    expect(output).not.toContain(MARKER);
  });

  it('reports the secret fixture thoroughly, so the check above is meaningful', () => {
    const { output } = run(['check', '--env', secrets, '--example', example, '--schema', schema]);
    for (const id of ['ENV001', 'ENV002', 'ENV003', 'ENV004', 'ENV005', 'ENV006', 'ENV009']) {
      expect(output).toContain(id);
    }
  });
});
