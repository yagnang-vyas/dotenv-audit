import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UsageError } from '../../src/errors.js';
import { describeReadError, readTextFile } from '../../src/files.js';

describe('readTextFile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dotenv-audit-files-'));

  it('reads a file', () => {
    const path = join(dir, 'ok.env');
    writeFileSync(path, 'A=1');
    expect(readTextFile(path)).toBe('A=1');
  });

  it.each([
    ['missing file', join(dir, 'missing.env'), 'file not found'],
    ['directory', dir, 'is a directory'],
  ])('reports a %s as a usage error', (_name, path, reason) => {
    expect(() => readTextFile(path)).toThrow(new UsageError(`cannot read ${path}: ${reason}`));
  });

  it.each([
    ['EACCES', 'permission denied'],
    ['EPERM', 'permission denied'],
    ['EIO', 'read failed'],
  ])('describes %s errors', (code, reason) => {
    expect(describeReadError(Object.assign(new Error('x'), { code }))).toBe(reason);
  });

  it('describes non-errors', () => {
    expect(describeReadError('nope')).toBe('read failed');
  });
});
