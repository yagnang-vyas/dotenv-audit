import type { DiffCounts } from '../diff.js';
import type { Finding } from '../types.js';

export type Command = 'check' | 'diff' | 'scan';

/** Everything a report needs. Contains no env values by construction. */
export interface ReportInput {
  command: Command;
  findings: readonly Finding[];
  diff?: { a: string; b: string; counts: DiffCounts };
}

export interface Summary {
  errors: number;
  warnings: number;
  notes: number;
}

export function summarize(findings: readonly Finding[]): Summary {
  const summary: Summary = { errors: 0, warnings: 0, notes: 0 };
  for (const { severity } of findings) {
    if (severity === 'error') summary.errors += 1;
    else if (severity === 'warning') summary.warnings += 1;
    else summary.notes += 1;
  }
  return summary;
}
