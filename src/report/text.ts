import type { Finding } from '../types.js';
import { summarize, type ReportInput } from './summary.js';

export interface TextOptions {
  /** Print findings only, without the summary lines. */
  quiet?: boolean;
}

/** Human-readable report: one line per finding, then a summary. */
export function formatText(report: ReportInput, options: TextOptions = {}): string {
  const lines = report.findings.map(formatFinding);
  if (options.quiet !== true) {
    if (report.diff !== undefined) {
      const { a, b, counts } = report.diff;
      lines.push(
        `${a} vs ${b}: ${counts.onlyInA} only in ${a}, ${counts.onlyInB} only in ${b}, ` +
          `${counts.different} different, ${counts.identical} identical`,
      );
    }
    const { errors, warnings, notes } = summarize(report.findings);
    lines.push(
      report.findings.length === 0
        ? 'no findings'
        : `${plural(errors, 'error')}, ${plural(warnings, 'warning')}, ${plural(notes, 'note')}`,
    );
  }
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

function formatFinding(finding: Finding): string {
  const location = finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
  const subject = finding.key === null ? '' : `${finding.key}: `;
  return `${location}  ${finding.severity}  ${finding.id}  ${subject}${finding.message}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
