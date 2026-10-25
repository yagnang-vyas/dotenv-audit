import { readFile } from 'node:fs/promises';
import { UsageError } from './errors.js';

/**
 * Reads a UTF-8 text file, turning file-system failures into usage errors.
 * The message names the path and the reason only, never file content.
 */
export async function readTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    throw new UsageError(`cannot read ${path}: ${describeReadError(error)}`);
  }
}

/** Maps a file-system error to a short, content-free reason. */
export function describeReadError(error: unknown): string {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'ENOENT':
      return 'file not found';
    case 'EACCES':
    case 'EPERM':
      return 'permission denied';
    case 'EISDIR':
      return 'is a directory';
    default:
      return 'read failed';
  }
}
