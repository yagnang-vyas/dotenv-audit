import { describe, expect, it } from 'vitest';
import { finding, problemFindings, severityRank, sortFindings } from '../../src/findings.js';

describe('problemFindings', () => {
  it('maps every problem kind to a value-free finding', () => {
    expect(
      problemFindings('.env', [
        { kind: 'invalid-line', line: 1 },
        { kind: 'invalid-line', line: 2, key: 'A' },
        { kind: 'unterminated-quote', line: 3, key: 'B' },
        { kind: 'duplicate-key', line: 4, key: 'C', previousLine: 1 },
      ]),
    ).toEqual([
      finding('ENV006', '.env', 1, null, 'line is not a valid KEY=value assignment'),
      finding('ENV006', '.env', 2, 'A', 'unexpected text after the closing quote'),
      finding('ENV006', '.env', 3, 'B', 'unterminated quoted value'),
      finding('ENV005', '.env', 4, 'C', 'duplicate key (also set on line 1); the last value wins'),
    ]);
  });
});

describe('sortFindings', () => {
  it('orders by file, line (whole-file first), ID and key without mutating input', () => {
    const input = [
      finding('ENV004', 'b.env', 2, 'B', 'm'),
      finding('ENV004', 'a.env', 5, 'Z', 'm'),
      finding('ENV001', 'a.env', null, 'Y', 'm'),
      finding('ENV001', 'a.env', null, 'X', 'm'),
      finding('ENV002', 'a.env', 5, 'A', 'm'),
      finding('ENV004', 'a.env', 5, 'A', 'm'),
    ];
    const sorted = sortFindings(input);
    expect(sorted.map((f) => `${f.file}:${String(f.line)}:${f.id}:${String(f.key)}`)).toEqual([
      'a.env:null:ENV001:X',
      'a.env:null:ENV001:Y',
      'a.env:5:ENV002:A',
      'a.env:5:ENV004:A',
      'a.env:5:ENV004:Z',
      'b.env:2:ENV004:B',
    ]);
    expect(input[0]?.file).toBe('b.env');
  });

  it('treats identical findings as equal', () => {
    const a = finding('ENV002', '.env', 1, 'A', 'm');
    expect(sortFindings([a, { ...a }])).toEqual([a, a]);
  });
});

describe('severityRank', () => {
  it('ranks error before warning before note', () => {
    expect(severityRank('error')).toBeLessThan(severityRank('warning'));
    expect(severityRank('warning')).toBeLessThan(severityRank('note'));
  });
});
