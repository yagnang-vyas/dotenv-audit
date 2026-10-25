import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeError, isEntryPoint, main, run } from '../../src/cli.js';
import { EXIT_INTERRUPTED, EXIT_OK, EXIT_USAGE, UsageError } from '../../src/errors.js';
import { captureIo } from '../helpers.js';

describe('cli', () => {
  it('prints the version', () => {
    const c = captureIo();
    expect(run(['--version'], c.io)).toBe(EXIT_OK);
    expect(c.out()).toBe(`${__VERSION__}\n`);
  });

  it('prints help by default and with --help', () => {
    for (const args of [[], ['--help'], ['-h']]) {
      const c = captureIo();
      expect(run(args, c.io)).toBe(EXIT_OK);
      expect(c.out()).toContain('Usage:');
    }
  });

  it('reports unknown flags as usage errors', () => {
    const c = captureIo();
    expect(run(['--nope'], c.io)).toBe(EXIT_USAGE);
    expect(c.err()).toMatch(/^dotenv-audit: error: .*--nope/);
    expect(c.out()).toBe('');
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

  it('writes to process stdout and sets the exit code', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    main(['--version']);
    expect(write).toHaveBeenCalledWith(`${__VERSION__}\n`);
    expect(process.exitCode).toBe(EXIT_OK);
  });

  it('writes errors to process stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    main(['--bogus']);
    expect(write).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(EXIT_USAGE);
  });

  it('exits with 130 on SIGINT', () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    main(['--version']);
    process.emit('SIGINT');
    expect(exit).toHaveBeenCalledWith(EXIT_INTERRUPTED);
  });
});
