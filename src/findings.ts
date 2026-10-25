import type { Finding, FindingId, Problem, Severity } from './types.js';

export const DEFAULT_SEVERITY: Readonly<Record<FindingId, Severity>> = {
  ENV001: 'error',
  ENV002: 'warning',
  ENV003: 'error',
  ENV004: 'error',
  ENV005: 'warning',
  ENV006: 'error',
  ENV007: 'error',
  ENV008: 'warning',
  ENV009: 'error',
  ENV010: 'warning',
  ENV011: 'note',
};

export function finding(
  id: FindingId,
  file: string,
  line: number | null,
  key: string | null,
  message: string,
  severity: Severity = DEFAULT_SEVERITY[id],
): Finding {
  return { id, severity, file, line, key, message };
}

/** Converts parser problems into ENV005/ENV006 findings for `file`. */
export function problemFindings(file: string, problems: readonly Problem[]): Finding[] {
  return problems.map((problem) => {
    const key = problem.key ?? null;
    switch (problem.kind) {
      case 'duplicate-key':
        return finding(
          'ENV005',
          file,
          problem.line,
          key,
          `duplicate key (also set on line ${String(problem.previousLine)}); the last value wins`,
        );
      case 'unterminated-quote':
        return finding('ENV006', file, problem.line, key, 'unterminated quoted value');
      case 'invalid-line':
        return finding(
          'ENV006',
          file,
          problem.line,
          key,
          key === null
            ? 'line is not a valid KEY=value assignment'
            : 'unexpected text after the closing quote',
        );
    }
  });
}

const SEVERITY_RANK: Readonly<Record<Severity, number>> = { error: 0, warning: 1, note: 2 };

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

/** Sorts by file, line (whole-file findings first), ID, then key. */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      compare(a.file, b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      compare(a.id, b.id) ||
      compare(a.key ?? '', b.key ?? ''),
  );
}

function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
