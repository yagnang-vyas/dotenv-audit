#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { EXIT_INTERRUPTED, EXIT_OK, EXIT_USAGE, UsageError } from './errors.js';
import { VERSION } from './version.js';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export const HELP = `dotenv-audit ${VERSION}

Audit .env files without ever printing their values.

Usage:
  dotenv-audit <command> [options]

Commands:
  check   Check an env file against an example file and/or a typed schema
  diff    Compare the keys of two env files without showing values
  scan    Find env files tracked by git and check .gitignore coverage

Options:
  -h, --help     Show this help
  -v, --version  Show the version
`;

/** Runs the CLI with the given arguments and returns the process exit code. */
export function run(argv: readonly string[], io: CliIo): number {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
      strict: true,
    });
    if (values.version === true) {
      io.stdout(`${VERSION}\n`);
      return EXIT_OK;
    }
    io.stdout(HELP);
    return EXIT_OK;
  } catch (error) {
    io.stderr(`dotenv-audit: error: ${describeError(error)}\n`);
    return EXIT_USAGE;
  }
}

/** Turns any thrown error into a message that is safe to print. */
export function describeError(error: unknown): string {
  if (error instanceof UsageError) return error.message;
  // parseArgs reports unknown flags with ERR_PARSE_ARGS_* codes; their messages
  // only echo the flag name, never an env value.
  if (
    error instanceof Error &&
    'code' in error &&
    String(error.code).startsWith('ERR_PARSE_ARGS')
  ) {
    return error.message;
  }
  return 'unexpected internal error';
}

/** True when `script` (normally `process.argv[1]`) resolves to the module at `moduleUrl`. */
export function isEntryPoint(moduleUrl: string, script: string | undefined): boolean {
  if (script === undefined) return false;
  try {
    return moduleUrl === pathToFileURL(realpathSync(script)).href;
  } catch {
    return false;
  }
}

/** Process entry point: wires `run` to the real stdio and exit code. */
export function main(argv: readonly string[] = process.argv.slice(2)): void {
  process.once('SIGINT', () => process.exit(EXIT_INTERRUPTED));
  process.exitCode = run(argv, {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  });
}

if (isEntryPoint(import.meta.url, process.argv[1])) main();
