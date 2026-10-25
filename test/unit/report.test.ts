import { describe, expect, it } from 'vitest';
import { finding } from '../../src/findings.js';
import { formatJson } from '../../src/report/json.js';
import { summarize } from '../../src/report/summary.js';
import { formatText } from '../../src/report/text.js';

const findings = [
  finding('ENV001', '.env', null, 'DATABASE_URL', 'required key is missing'),
  finding('ENV004', '.env', 4, 'PORT', 'expected an integer between 1 and 65535'),
  finding('ENV006', '.env', 7, null, 'line is not a valid KEY=value assignment'),
  finding('ENV002', '.env', 9, 'EXTRA', 'key is not defined in the example file'),
  finding('ENV011', '.env', 10, 'URL', 'value differs from b.env (line 2)'),
];

describe('summarize', () => {
  it('counts by severity', () => {
    expect(summarize(findings)).toEqual({ errors: 3, warnings: 1, notes: 1 });
  });
});

describe('formatText', () => {
  it('prints one line per finding and a summary', () => {
    expect(formatText({ command: 'check', findings })).toBe(
      [
        '.env  error  ENV001  DATABASE_URL: required key is missing',
        '.env:4  error  ENV004  PORT: expected an integer between 1 and 65535',
        '.env:7  error  ENV006  line is not a valid KEY=value assignment',
        '.env:9  warning  ENV002  EXTRA: key is not defined in the example file',
        '.env:10  note  ENV011  URL: value differs from b.env (line 2)',
        '3 errors, 1 warning, 1 note',
        '',
      ].join('\n'),
    );
  });

  it('says so when there are no findings', () => {
    expect(formatText({ command: 'check', findings: [] })).toBe('no findings\n');
  });

  it('prints nothing in quiet mode without findings', () => {
    expect(formatText({ command: 'check', findings: [] }, { quiet: true })).toBe('');
  });

  it('omits the summary in quiet mode', () => {
    expect(formatText({ command: 'check', findings: findings.slice(0, 1) }, { quiet: true })).toBe(
      '.env  error  ENV001  DATABASE_URL: required key is missing\n',
    );
  });

  it('adds diff counts', () => {
    const counts = { onlyInA: 1, onlyInB: 0, different: 2, identical: 3 };
    expect(
      formatText({ command: 'diff', findings: [], diff: { a: 'a.env', b: 'b.env', counts } }),
    ).toBe(
      'a.env vs b.env: 1 only in a.env, 0 only in b.env, 2 different, 3 identical\nno findings\n',
    );
  });
});

describe('formatJson', () => {
  it('produces the documented, stable structure', () => {
    const output = formatJson({ command: 'check', findings: findings.slice(1, 2) });
    expect(output).toBe(
      `${JSON.stringify(
        {
          schemaVersion: 1,
          tool: { name: 'dotenv-audit', version: __VERSION__ },
          command: 'check',
          findings: [
            {
              id: 'ENV004',
              severity: 'error',
              file: '.env',
              line: 4,
              key: 'PORT',
              message: 'expected an integer between 1 and 65535',
            },
          ],
          summary: { errors: 1, warnings: 0, notes: 0 },
        },
        null,
        2,
      )}\n`,
    );
  });

  it('includes diff counts for diff', () => {
    const counts = { onlyInA: 1, onlyInB: 0, different: 2, identical: 3 };
    const parsed = JSON.parse(
      formatJson({ command: 'diff', findings: [], diff: { a: 'a', b: 'b', counts } }),
    ) as {
      diff: unknown;
    };
    expect(parsed.diff).toEqual(counts);
  });
});
