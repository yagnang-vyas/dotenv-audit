import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeError, exitCode, isEntryPoint, main, run } from '../../src/cli.js';
import {
  EXIT_FINDINGS,
  EXIT_INTERRUPTED,
  EXIT_OK,
  EXIT_USAGE,
  UsageError,
} from '../../src/errors.js';
import { finding } from '../../src/findings.js';
import { captureIo } from '../helpers.js';

const fixtures = 'test/fixtures';

async function cli(...args: string[]): Promise<{ code: number; out: string; err: string }> {
  const c = captureIo();
  const code = await run(args, c.io);
  return { code, out: c.out(), err: c.err() };
}

describe('run', () => {
  it('prints the version', async () => {
    expect(await cli('--version')).toEqual({ code: EXIT_OK, out: `${__VERSION__}\n`, err: '' });
  });

  it('prints help without a command and with --help', async () => {
    for (const args of [[], ['--help'], ['-h'], ['check', '--help']]) {
      const result = await cli(...args);
      expect(result.code).toBe(EXIT_OK);
      expect(result.out).toContain('Usage:');
    }
  });

  it('runs check against an example by default', async () => {
    const result = await cli(
      'check',
      '--env',
      `${fixtures}/check/broken.env`,
      '--example',
      `${fixtures}/check/example.env`,
    );
    expect(result.code).toBe(EXIT_FINDINGS);
    expect(result.out).toContain(
      `${fixtures}/check/broken.env  error  ENV001  ADMIN_EMAIL: required key is missing\n`,
    );
    expect(result.out).toContain(
      `${fixtures}/check/broken.env:8  error  ENV006  line is not a valid KEY=value assignment\n`,
    );
    expect(result.out.endsWith('\n6 errors, 3 warnings, 0 notes\n')).toBe(true);
  });

  it('runs check against a schema only', async () => {
    const result = await cli(
      'check',
      '--env',
      `${fixtures}/check/valid.env`,
      '--schema',
      `${fixtures}/check/env.schema.json`,
      '--format',
      'json',
    );
    expect(result.code).toBe(EXIT_OK);
    expect(JSON.parse(result.out)).toMatchObject({ command: 'check', findings: [] });
  });

  it('runs diff and prints counts', async () => {
    const result = await cli(
      'diff',
      `${fixtures}/diff/staging.env`,
      `${fixtures}/diff/production.env`,
    );
    expect(result.code).toBe(EXIT_OK);
    expect(result.out).toContain('1 only in');
    expect(result.out.endsWith('0 errors, 2 warnings, 2 notes\n')).toBe(true);
  });

  it('runs scan on a directory', async () => {
    const result = await cli('scan', '/', '--fail-on', 'never');
    expect(result.code).toBe(EXIT_USAGE);
    expect(result.err).toBe('dotenv-audit: error: not a git repository: /\n');
  });

  it.each([
    [['nope'], 'unknown command "nope" (expected check, diff or scan)'],
    [['check', 'extra'], 'check expects 0 arguments, got 1'],
    [['diff', 'a'], 'diff expects 2 arguments, got 1'],
    [['scan', 'a', 'b'], 'scan expects 0 to 1 argument, got 2'],
    [['diff', 'a', 'b', '--env', 'x'], '--env is only valid with check, not diff'],
    [['scan', '--schema', 'x'], '--schema is only valid with check, not scan'],
    [['check', '--format', 'xml'], '--format must be one of: text, json'],
    [['check', '--fail-on', 'all'], '--fail-on must be one of: error, warning, never'],
    [['check', '--env', 'missing.env'], 'cannot read missing.env: file not found'],
  ])('reports usage errors: %j', async (args, message) => {
    expect(await cli(...args)).toEqual({
      code: EXIT_USAGE,
      out: '',
      err: `dotenv-audit: error: ${message}\n`,
    });
  });

  it('reports unknown flags', async () => {
    const result = await cli('--nope');
    expect(result.code).toBe(EXIT_USAGE);
    expect(result.err).toMatch(/^dotenv-audit: error: .*--nope/);
  });
});

describe('exitCode', () => {
  const error = finding('ENV001', '.env', null, 'A', 'm');
  const warning = finding('ENV002', '.env', 1, 'A', 'm');
  const note = finding('ENV011', '.env', 1, 'A', 'm');

  it.each([
    ['error', [warning, note], EXIT_OK],
    ['error', [error], EXIT_FINDINGS],
    ['warning', [note], EXIT_OK],
    ['warning', [warning], EXIT_FINDINGS],
    ['note', [note], EXIT_FINDINGS],
    ['never', [error], EXIT_OK],
  ] as const)('fail-on %s', (failOn, findings, expected) => {
    expect(exitCode(findings, failOn)).toBe(expected);
  });
});

describe('describeError', () => {
  it('passes usage error messages through', () => {
    expect(describeError(new UsageError('file not found: .env'))).toBe('file not found: .env');
  });

  it('hides messages of unexpected errors', () => {
    expect(describeError(new Error('boom: secret-ish detail'))).toBe('unexpected internal error');
    expect(describeError('string')).toBe('unexpected internal error');
  });
});

describe('isEntryPoint', () => {
  it('matches the resolved script path', () => {
    const file = fileURLToPath(import.meta.url);
    expect(isEntryPoint(import.meta.url, file)).toBe(true);
    expect(isEntryPoint(import.meta.url, undefined)).toBe(false);
    expect(isEntryPoint(import.meta.url, '/does/not/exist.js')).toBe(false);
  });
});

describe('main', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it('writes to process stdout and sets the exit code', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await main(['--version']);
    expect(write).toHaveBeenCalledWith(`${__VERSION__}\n`);
    expect(process.exitCode).toBe(EXIT_OK);
  });

  it('writes errors to process stderr', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    await main(['--bogus']);
    expect(write).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(EXIT_USAGE);
  });

  it('exits with 130 on SIGINT while running and removes the handler afterwards', async () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const before = process.listenerCount('SIGINT');
    const running = main(['--version']);
    expect(process.listenerCount('SIGINT')).toBe(before + 1);
    process.emit('SIGINT');
    expect(exit).toHaveBeenCalledWith(EXIT_INTERRUPTED);
    await running;
    expect(process.listenerCount('SIGINT')).toBe(before);
  });
});
