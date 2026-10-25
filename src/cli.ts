#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { check } from './check.js';
import { diff } from './diff.js';
import { EXIT_FINDINGS, EXIT_INTERRUPTED, EXIT_OK, EXIT_USAGE, UsageError } from './errors.js';
import { readTextFile } from './files.js';
import { severityRank } from './findings.js';
import { formatJson } from './report/json.js';
import type { Command, ReportInput } from './report/summary.js';
import { formatText } from './report/text.js';
import { scan } from './scan.js';
import { loadSchemaFile } from './schema.js';
import type { Finding, Severity } from './types.js';
import { VERSION } from './version.js';

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

export const HELP = `dotenv-audit ${VERSION}

Audit .env files without ever printing their values.

Usage:
  dotenv-audit check [--env .env] [--example .env.example] [--schema env.schema.json]
  dotenv-audit diff <fileA> <fileB>
  dotenv-audit scan [dir]

Commands:
  check   Check an env file against an example file and/or a typed schema
          (with neither option, --example defaults to .env.example)
  diff    Compare the keys of two env files without showing values
  scan    Find env files tracked by git and check .gitignore coverage

Options:
  --env <path>        Env file to check (default: .env)
  --example <path>    Example file listing the expected keys
  --schema <path>     JSON schema describing types and constraints
  --format <format>   text or json (default: text)
  --fail-on <level>   error, warning or never (default: error)
  -q, --quiet         Text format: print findings only, no summary
  -h, --help          Show this help
  -v, --version       Show the version

Exit codes:
  0  no findings at or above --fail-on
  1  findings at or above --fail-on
  2  usage or input error
  130  interrupted
`;

const OPTIONS = {
  env: { type: 'string' },
  example: { type: 'string' },
  schema: { type: 'string' },
  format: { type: 'string' },
  'fail-on': { type: 'string' },
  quiet: { type: 'boolean', short: 'q' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
} as const;

type Format = 'text' | 'json';
type FailOn = Severity | 'never';

interface Options {
  env?: string | undefined;
  example?: string | undefined;
  schema?: string | undefined;
}

/** Runs the CLI with the given arguments and returns the process exit code. */
export async function run(argv: readonly string[], io: CliIo): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });
    if (values.version === true) {
      io.stdout(`${VERSION}\n`);
      return EXIT_OK;
    }
    const [command, ...operands] = positionals;
    if (values.help === true || command === undefined) {
      io.stdout(HELP);
      return EXIT_OK;
    }
    const format = choice<Format>('--format', values.format ?? 'text', ['text', 'json']);
    const failOn = choice<FailOn>('--fail-on', values['fail-on'] ?? 'error', [
      'error',
      'warning',
      'never',
    ]);
    const report = await execute(command, operands, values);
    io.stdout(
      format === 'json' ? formatJson(report) : formatText(report, { quiet: values.quiet === true }),
    );
    return exitCode(report.findings, failOn);
  } catch (error) {
    io.stderr(`dotenv-audit: error: ${describeError(error)}\n`);
    return EXIT_USAGE;
  }
}

async function execute(
  command: string,
  operands: readonly string[],
  options: Options,
): Promise<ReportInput> {
  switch (command) {
    case 'check':
      expectOperands(command, operands, 0, 0);
      return { command, findings: await runCheck(options) };
    case 'diff': {
      rejectFileOptions(command, options);
      expectOperands(command, operands, 2, 2);
      const [a = '', b = ''] = operands;
      const [textA, textB] = await Promise.all([readTextFile(a), readTextFile(b)]);
      const result = diff({ path: a, text: textA }, { path: b, text: textB });
      return { command, findings: result.findings, diff: { a, b, counts: result.counts } };
    }
    case 'scan':
      rejectFileOptions(command, options);
      expectOperands(command, operands, 0, 1);
      return { command, findings: await scan(operands[0]) };
    default:
      throw new UsageError(`unknown command "${command}" (expected check, diff or scan)`);
  }
}

async function runCheck(options: Options): Promise<Finding[]> {
  const envPath = options.env ?? '.env';
  const examplePath =
    options.example ?? (options.schema === undefined ? '.env.example' : undefined);
  // Load the schema first so schema errors are reported before file content is read.
  const schema = options.schema === undefined ? undefined : await loadSchemaFile(options.schema);
  const env = { path: envPath, text: await readTextFile(envPath) };
  const example =
    examplePath === undefined
      ? undefined
      : { path: examplePath, text: await readTextFile(examplePath) };
  return check({
    env,
    ...(example === undefined ? {} : { example }),
    ...(schema === undefined ? {} : { schema }),
  });
}

function expectOperands(
  command: Command,
  operands: readonly string[],
  min: number,
  max: number,
): void {
  if (operands.length < min || operands.length > max) {
    const expected = min === max ? `${min}` : `${min} to ${max}`;
    throw new UsageError(
      `${command} expects ${expected} argument${max === 1 ? '' : 's'}, got ${operands.length}`,
    );
  }
}

function rejectFileOptions(command: Command, options: Options): void {
  for (const name of ['env', 'example', 'schema'] as const) {
    if (options[name] !== undefined)
      throw new UsageError(`--${name} is only valid with check, not ${command}`);
  }
}

function choice<T extends string>(flag: string, value: string, allowed: readonly T[]): T {
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw new UsageError(`${flag} must be one of: ${allowed.join(', ')}`);
  return match;
}

/** Exit code for a set of findings, given the lowest severity that fails. */
export function exitCode(findings: readonly Finding[], failOn: FailOn): number {
  if (failOn === 'never') return EXIT_OK;
  const threshold = severityRank(failOn);
  return findings.some((finding) => severityRank(finding.severity) <= threshold)
    ? EXIT_FINDINGS
    : EXIT_OK;
}

/** Turns any thrown error into a message that is safe to print. */
export function describeError(error: unknown): string {
  if (error instanceof UsageError) return error.message;
  // parseArgs reports unknown flags with ERR_PARSE_ARGS_* codes; their messages
  // only echo command-line arguments, never env file content.
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
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const onInterrupt = (): never => process.exit(EXIT_INTERRUPTED);
  process.once('SIGINT', onInterrupt);
  try {
    process.exitCode = await run(argv, {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    });
  } finally {
    process.off('SIGINT', onInterrupt);
  }
}

if (isEntryPoint(import.meta.url, process.argv[1])) await main();
