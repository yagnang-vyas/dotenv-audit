/**
 * An error caused by how the tool was invoked or by unusable input (missing
 * file, invalid schema, not a git repository). Maps to exit code 2.
 *
 * Messages must never contain a value read from an env file.
 */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

export const EXIT_OK = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_USAGE = 2;
export const EXIT_INTERRUPTED = 130;
