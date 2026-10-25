import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { git, isolateGit, tempRepo } from '../git.js';

const cli = resolve('dist/cli.js');
const fixtures = resolve('test/fixtures');

interface Result {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(args: string[], cwd = process.cwd()): Result {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeAll(isolateGit);

describe('built cli', () => {
  it('prints the version', () => {
    expect(run(['--version'])).toEqual({ status: 0, stdout: `${__VERSION__}\n`, stderr: '' });
  });

  it('exits 0 for a clean check', () => {
    const result = run([
      'check',
      '--env',
      'test/fixtures/check/valid.env',
      '--example',
      'test/fixtures/check/example.env',
      '--schema',
      'test/fixtures/check/env.schema.json',
    ]);
    expect(result).toEqual({ status: 0, stdout: 'no findings\n', stderr: '' });
  });

  it('exits 1 with text findings', () => {
    const result = run([
      'check',
      '--env',
      'test/fixtures/check/broken.env',
      '--schema',
      'test/fixtures/check/env.schema.json',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(
      'test/fixtures/check/broken.env:3  error  ENV004  PORT: expected an integer between 1 and 65535\n',
    );
    expect(result.stdout).toMatch(/\n10 errors, 1 warning, 0 notes\n$/);
  });

  it('writes deterministic JSON', () => {
    const args = [
      'diff',
      'test/fixtures/diff/staging.env',
      'test/fixtures/diff/production.env',
      '--format',
      'json',
    ];
    const first = run(args);
    expect(first.status).toBe(0);
    expect(run(args).stdout).toBe(first.stdout);
    const report = JSON.parse(first.stdout) as Record<string, unknown>;
    expect(Object.keys(report)).toEqual([
      'schemaVersion',
      'tool',
      'command',
      'findings',
      'summary',
      'diff',
    ]);
    expect(report).toMatchObject({
      schemaVersion: 1,
      tool: { name: 'dotenv-audit', version: __VERSION__ },
      command: 'diff',
      summary: { errors: 0, warnings: 2, notes: 2 },
      diff: { onlyInA: 1, onlyInB: 1, different: 2, identical: 2 },
    });
  });

  it('honours --fail-on', () => {
    const args = ['diff', 'test/fixtures/diff/staging.env', 'test/fixtures/diff/production.env'];
    expect(run([...args, '--fail-on', 'error']).status).toBe(0);
    expect(run([...args, '--fail-on', 'warning']).status).toBe(1);
    expect(run([...args, '--fail-on', 'never']).status).toBe(0);
  });

  it('uses .env and .env.example from the working directory by default', () => {
    const repo = tempRepo({ '.env': 'A=1\n', '.env.example': 'A=\nB=\n' });
    expect(run(['check', '--quiet'], repo)).toEqual({
      status: 1,
      stdout: '.env  error  ENV001  B: required key is missing\n',
      stderr: '',
    });
  });

  it('scans a git repository', () => {
    const repo = tempRepo({ '.env': 'A=fake\n' });
    git(repo, 'add', '-f', '.env');
    const result = run(['scan', repo, '--format', 'json']);
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as { findings: { id: string; file: string }[] };
    expect(report.findings).toEqual([
      expect.objectContaining({ id: 'ENV007', file: join(repo, '.env') }),
      expect.objectContaining({ id: 'ENV008', file: join(repo, '.env') }),
    ]);
  });

  it.each([
    [['check', '--env', 'missing.env'], 'cannot read missing.env: file not found'],
    [['check', '--schema', join(fixtures, 'privacy', 'other.env')], 'invalid JSON'],
    [['scan', fixtures.split('/').slice(0, 2).join('/') || '/'], 'not a git repository'],
    [['nope'], 'unknown command "nope"'],
    [['check', '--format', 'xml'], '--format must be one of: text, json'],
    [['diff', 'a.env'], 'diff expects 2 arguments, got 1'],
    [['--bogus'], "Unknown option '--bogus'"],
  ])('exits 2 for usage errors: %j', (args, message) => {
    const result = run(args);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^dotenv-audit: error: /);
    expect(result.stderr).toContain(message);
    expect(result.stderr).not.toMatch(/\n\s+at /);
  });

  it.skipIf(process.platform === 'win32')('exits 130 when interrupted', async () => {
    // A fake `git` that hangs keeps the CLI busy long enough to interrupt it.
    const bin = mkdtempSync(join(tmpdir(), 'dotenv-audit-slow-git-'));
    const sleep = execFileSync('sh', ['-c', 'command -v sleep'], { encoding: 'utf8' }).trim();
    writeFileSync(join(bin, 'git'), `#!/bin/sh\nexec ${sleep} 10\n`, { mode: 0o755 });
    const child = spawn(process.execPath, [cli, 'scan', '.'], {
      env: { ...process.env, PATH: bin },
      stdio: 'ignore',
    });
    const status = await new Promise<number | null>((done) => {
      setTimeout(() => child.kill('SIGINT'), 500);
      child.on('exit', (code) => {
        done(code);
      });
    });
    expect(status).toBe(130);
  });
});
