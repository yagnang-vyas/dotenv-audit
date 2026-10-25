import { VERSION } from '../version.js';
import { summarize, type ReportInput } from './summary.js';

export const JSON_SCHEMA_VERSION = 1;

/** Machine-readable report (schemaVersion 1). Key order is fixed. */
export function formatJson(report: ReportInput): string {
  const output = {
    schemaVersion: JSON_SCHEMA_VERSION,
    tool: { name: 'dotenv-audit', version: VERSION },
    command: report.command,
    findings: report.findings.map(({ id, severity, file, line, key, message }) => ({
      id,
      severity,
      file,
      line,
      key,
      message,
    })),
    summary: summarize(report.findings),
    ...(report.diff === undefined ? {} : { diff: report.diff.counts }),
  };
  return `${JSON.stringify(output, null, 2)}\n`;
}
