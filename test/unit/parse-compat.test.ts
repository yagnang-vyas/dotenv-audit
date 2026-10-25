import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parse.js';

function ours(text: string): Record<string, string> {
  return Object.fromEntries(parse(text).entries.map((entry) => [entry.key, entry.value]));
}

describe('compatibility with the dotenv package', () => {
  it.each(['compatible.env', 'crlf.env'])('parses %s identically', (name) => {
    const text = readFileSync(`test/fixtures/parser/${name}`, 'utf8');
    const result = parse(text);
    expect(result.problems.filter((p) => p.kind !== 'duplicate-key')).toEqual([]);
    expect(ours(text)).toEqual(dotenv.parse(text));
  });

  // Intentional differences, documented in SPEC.md under Decisions.
  const differences: [name: string, input: string, ourValues: Record<string, string>][] = [
    ['# without preceding space stays in the value', 'A=abc#def', { A: 'abc#def' }],
    ['double quotes expand \\t, \\" and \\\\', 'A="a\\tb\\"c\\\\"', { A: 'a\tb"c\\' }],
    ['keys must not start with a digit', '1A=x', {}],
    ['colon syntax is not an assignment', 'A: 1', {}],
    ['unterminated quotes produce no entry', 'A="abc', {}],
    ['text after a closing quote produces no entry', 'A="x" junk', {}],
  ];

  it.each(differences)('differs on purpose: %s', (_name, input, ourValues) => {
    expect(ours(input)).toEqual(ourValues);
    expect(dotenv.parse(input)).not.toEqual(ourValues);
  });
});
