/**
 * The playground's audit entry point. It calls the CLI's own engine modules
 * (imported from the repository's `src/`), so findings, messages, ordering and
 * reports are exactly what `dotenv-audit check` and `dotenv-audit diff` print.
 *
 * Only pure modules are imported here: no file system, git or process access.
 */
import { check } from '@core/check.ts';
import { diff, type DiffCounts } from '@core/diff.ts';
import { UsageError } from '@core/errors.ts';
import { severityRank } from '@core/findings.ts';
import { parse } from '@core/parse.ts';
import { formatJson } from '@core/report/json.ts';
import { summarize, type Summary } from '@core/report/summary.ts';
import { formatText } from '@core/report/text.ts';
import { parseSchema } from '@core/schema.ts';
import type { Finding } from '@core/types.ts';

export type { Finding, Severity, FindingId } from '@core/types.ts';
export type { Summary, DiffCounts };

export type FailOn = 'error' | 'warning' | 'never';
export const FAIL_ON_LEVELS: readonly FailOn[] = ['error', 'warning', 'never'];

/** Inputs larger than this are refused; the CLI has no such limit. */
export const MAX_INPUT_BYTES = 256 * 1024;

/** File names are shown in findings and in the equivalent CLI command. */
const FILE_NAME = /^[A-Za-z0-9._/-]{1,64}$/;

export interface InputFile {
  name: string;
  text: string;
}

export type AuditRequest =
  | {
      mode: 'check';
      env: InputFile;
      example: InputFile | null;
      schema: InputFile | null;
      failOn: FailOn;
    }
  | { mode: 'diff'; a: InputFile; b: InputFile; failOn: FailOn };

export type DiffStatus = 'identical' | 'different' | 'only-a' | 'only-b';

/** One key in a diff. Deliberately has no field that could hold a value. */
export interface DiffRow {
  key: string;
  status: DiffStatus;
  lineA: number | null;
  lineB: number | null;
}

export interface AuditedFile {
  name: string;
  keys: number;
}

export interface CompletedAudit {
  status: 'completed';
  mode: AuditRequest['mode'];
  command: string;
  findings: Finding[];
  summary: Summary;
  /** What the CLI would exit with for this `--fail-on` level. */
  exitCode: 0 | 1;
  failOn: FailOn;
  textReport: string;
  jsonReport: string;
  /** The audited env files (not the reference files), with how many keys each parsed to. */
  files: AuditedFile[];
  diff?: { a: string; b: string; counts: DiffCounts; rows: DiffRow[] };
}

export interface FailedAudit {
  status: 'usage-error';
  mode: AuditRequest['mode'];
  command: string;
  /** Value-free reason, safe to display. */
  message: string;
}

export type AuditOutcome = CompletedAudit | FailedAudit;

/** Runs an audit synchronously. Never throws; never returns an env value. */
export function runAudit(request: AuditRequest): AuditOutcome {
  const command = cliCommand(request);
  try {
    return request.mode === 'check' ? runCheck(request, command) : runDiff(request, command);
  } catch (error) {
    return { status: 'usage-error', mode: request.mode, command, message: describeError(error) };
  }
}

function runCheck(
  request: Extract<AuditRequest, { mode: 'check' }>,
  command: string,
): AuditOutcome {
  validateFiles([request.env, request.example, request.schema]);
  if (request.example === null && request.schema === null) {
    throw new UsageError('provide an example file, a schema, or both to check against');
  }
  // Like the CLI, the schema is validated before any env content is examined.
  const schema =
    request.schema === null ? undefined : parseSchema(request.schema.text, request.schema.name);
  const env = { path: request.env.name, text: request.env.text };
  const findings = check({
    env,
    ...(request.example === null
      ? {}
      : { example: { path: request.example.name, text: request.example.text } }),
    ...(schema === undefined ? {} : { schema }),
  });
  const report = { command: 'check' as const, findings };
  return completed(request, command, report, [audited(request.env)]);
}

function runDiff(request: Extract<AuditRequest, { mode: 'diff' }>, command: string): AuditOutcome {
  validateFiles([request.a, request.b]);
  if (request.a.name === request.b.name) {
    throw new UsageError('the two files need different names so findings can tell them apart');
  }
  const a = { path: request.a.name, text: request.a.text };
  const b = { path: request.b.name, text: request.b.text };
  const result = diff(a, b);
  const report = {
    command: 'diff' as const,
    findings: result.findings,
    diff: { a: a.path, b: b.path, counts: result.counts },
  };
  const outcome = completed(request, command, report, [audited(request.a), audited(request.b)]);
  return {
    ...outcome,
    diff: { ...report.diff, rows: diffRows(a.text, b.text, a.path, result.findings) },
  };
}

function completed(
  request: AuditRequest,
  command: string,
  report: Parameters<typeof formatText>[0],
  files: AuditedFile[],
): CompletedAudit {
  return {
    status: 'completed',
    mode: request.mode,
    command,
    findings: [...report.findings],
    summary: summarize(report.findings),
    exitCode: exitCode(report.findings, request.failOn),
    failOn: request.failOn,
    textReport: formatText(report),
    jsonReport: formatJson(report),
    files,
  };
}

/**
 * Per-key status for the comparison table. Keys and lines come from the
 * engine's parser; "different" is taken from the engine's own ENV011 findings
 * rather than comparing values again here.
 */
function diffRows(
  textA: string,
  textB: string,
  nameA: string,
  findings: readonly Finding[],
): DiffRow[] {
  const entriesA = new Map(parse(textA).entries.map((entry) => [entry.key, entry.line]));
  const entriesB = new Map(parse(textB).entries.map((entry) => [entry.key, entry.line]));
  const different = new Set(
    findings.filter((f) => f.id === 'ENV011' && f.file === nameA).flatMap((f) => f.key ?? []),
  );
  const keys = [...new Set([...entriesA.keys(), ...entriesB.keys()])].sort();
  return keys.map((key) => {
    const lineA = entriesA.get(key) ?? null;
    const lineB = entriesB.get(key) ?? null;
    const status: DiffStatus =
      lineB === null
        ? 'only-a'
        : lineA === null
          ? 'only-b'
          : different.has(key)
            ? 'different'
            : 'identical';
    return { key, status, lineA, lineB };
  });
}

function audited(file: InputFile): AuditedFile {
  return { name: file.name, keys: parse(file.text).entries.length };
}

function validateFiles(files: readonly (InputFile | null)[]): void {
  for (const file of files) {
    if (file === null) continue;
    if (!FILE_NAME.test(file.name)) {
      throw new UsageError(
        'file names may use letters, digits, ".", "_", "-" and "/" only (up to 64 characters)',
      );
    }
    if (new TextEncoder().encode(file.text).length > MAX_INPUT_BYTES) {
      throw new UsageError(
        `${file.name} is larger than ${MAX_INPUT_BYTES / 1024} KiB; use the CLI for large files`,
      );
    }
  }
}

/**
 * Mirrors `exitCode` in `src/cli.ts`, which cannot be imported in a browser
 * because that module also wires up `process`. A parity test guards it.
 */
export function exitCode(findings: readonly Finding[], failOn: FailOn): 0 | 1 {
  if (failOn === 'never') return 0;
  const threshold = severityRank(failOn);
  return findings.some((finding) => severityRank(finding.severity) <= threshold) ? 1 : 0;
}

/** Same rule as the CLI: only `UsageError` messages are shown, never raw errors. */
export function describeError(error: unknown): string {
  return error instanceof UsageError ? error.message : 'unexpected internal error';
}

/** The CLI invocation that performs the same audit on files with these names. */
export function cliCommand(request: AuditRequest): string {
  const failOn = request.failOn === 'error' ? '' : ` --fail-on ${request.failOn}`;
  if (request.mode === 'diff') {
    return `dotenv-audit diff ${request.a.name} ${request.b.name}${failOn}`;
  }
  const parts = ['dotenv-audit check', `--env ${request.env.name}`];
  if (request.example !== null) parts.push(`--example ${request.example.name}`);
  if (request.schema !== null) parts.push(`--schema ${request.schema.name}`);
  return parts.join(' ') + failOn;
}
