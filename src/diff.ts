import { finding, problemFindings, sortFindings } from './findings.js';
import { parse } from './parse.js';
import type { Finding, SourceFile } from './types.js';

export interface DiffCounts {
  onlyInA: number;
  onlyInB: number;
  different: number;
  identical: number;
}

export interface DiffResult {
  findings: Finding[];
  counts: DiffCounts;
}

/**
 * Compares the keys of two env files. Values are compared in memory only and
 * never appear in the result.
 */
export function diff(a: SourceFile, b: SourceFile): DiffResult {
  const parsedA = parse(a.text);
  const parsedB = parse(b.text);
  const findings = [
    ...problemFindings(a.path, parsedA.problems),
    ...problemFindings(b.path, parsedB.problems),
  ];
  const entriesB = new Map(parsedB.entries.map((entry) => [entry.key, entry]));
  const keysA = new Set(parsedA.entries.map((entry) => entry.key));
  const counts: DiffCounts = { onlyInA: 0, onlyInB: 0, different: 0, identical: 0 };

  for (const entry of parsedA.entries) {
    const other = entriesB.get(entry.key);
    if (other === undefined) {
      counts.onlyInA += 1;
      findings.push(
        finding('ENV010', a.path, entry.line, entry.key, `key is missing from ${b.path}`),
      );
    } else if (other.value === entry.value) {
      counts.identical += 1;
    } else {
      counts.different += 1;
      findings.push(
        finding(
          'ENV011',
          a.path,
          entry.line,
          entry.key,
          `value differs from ${b.path} (line ${other.line})`,
        ),
      );
    }
  }
  for (const entry of parsedB.entries) {
    if (!keysA.has(entry.key)) {
      counts.onlyInB += 1;
      findings.push(
        finding('ENV010', b.path, entry.line, entry.key, `key is missing from ${a.path}`),
      );
    }
  }

  return { findings: sortFindings(findings), counts };
}
