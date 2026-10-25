import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parse.js';
import type { Entry, Problem } from '../../src/types.js';

type Expected = Record<string, string>;

const valueCases: [name: string, input: string, expected: Expected][] = [
  ['simple assignment', 'A=1', { A: '1' }],
  ['export prefix', 'export A=1', { A: '1' }],
  ['export with extra spaces', 'export   A=1', { A: '1' }],
  ['key literally named export', 'export=1', { export: '1' }],
  ['whitespace around =', '  A  =  spaced value  ', { A: 'spaced value' }],
  ['tabs around =', 'A\t=\tv', { A: 'v' }],
  ['= inside value', 'A=b=c==', { A: 'b=c==' }],
  ['dots and dashes in key', 'A-B.c_d=1', { 'A-B.c_d': '1' }],
  ['underscore-led key', '_A=1', { _A: '1' }],
  ['inline comment after space', 'A=value # comment', { A: 'value' }],
  ['inline comment after tab', 'A=value\t# comment', { A: 'value' }],
  ['hash without space is literal', 'A=abc#def', { A: 'abc#def' }],
  ['value starting with hash', 'A=#notacomment', { A: '#notacomment' }],
  ['comment right after =', 'A= # comment', { A: '' }],
  ['empty value', 'A=', { A: '' }],
  ['empty double quotes', 'A=""', { A: '' }],
  ['empty single quotes', "A=''", { A: '' }],
  ['single quotes are literal', "A='x\\ny $B'", { A: 'x\\ny $B' }],
  ['single quotes keep #', "A='a # b'", { A: 'a # b' }],
  ['double quotes keep #', 'A="a # b" # real comment', { A: 'a # b' }],
  ['double quote escapes', 'A="n\\nr\\rt\\tq\\"b\\\\"', { A: 'n\nr\rt\tq"b\\' }],
  ['unknown escapes kept', 'A="\\x\\$"', { A: '\\x\\$' }],
  ['backticks are literal', 'A=`it\'s "x" \\n`', { A: 'it\'s "x" \\n' }],
  ['quotes inside unquoted value', 'A=x"y\'z', { A: 'x"y\'z' }],
  ['quoted value keeps inner spaces', 'A="  padded  "', { A: '  padded  ' }],
  ['multi-line double quotes', 'A="l1\nl2\nl3"\nB=2', { A: 'l1\nl2\nl3', B: '2' }],
  ['multi-line single quotes', "A='l1\nl2'", { A: 'l1\nl2' }],
  ['multi-line backticks', 'A=`l1\nl2`', { A: 'l1\nl2' }],
  ['escaped quote does not close', 'A="a\\"\nb"', { A: 'a"\nb' }],
  ['variable references are opaque', 'A=${B}', { A: '${B}' }],
  ['blank lines and comments', '\n# comment\n   # indented\n\nA=1\n', { A: '1' }],
  ['CRLF line endings', 'A=1\r\nB="x\r\ny"\r\n', { A: '1', B: 'x\ny' }],
  ['CR line endings', 'A=1\rB=2', { A: '1', B: '2' }],
  ['UTF-8 BOM', '﻿A=1', { A: '1' }],
  ['unicode values', 'A=héllo wörld', { A: 'héllo wörld' }],
  ['duplicate: last wins', 'A=1\nA=2', { A: '2' }],
];

function values(entries: Entry[]): Expected {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));
}

describe('parse: values', () => {
  it.each(valueCases)('%s', (_name, input, expected) => {
    expect(values(parse(input).entries)).toEqual(expected);
  });
});

describe('parse: metadata', () => {
  it('records 1-based line numbers of the key, even after multi-line values', () => {
    const { entries } = parse('# c\nA=1\nB="x\ny"\n\nC=3');
    expect(entries.map((e) => [e.key, e.line])).toEqual([
      ['A', 2],
      ['B', 3],
      ['C', 6],
    ]);
  });

  it('records the quote style', () => {
    const { entries } = parse('A=1\nB=\'2\'\nC="3"\nD=`4`');
    expect(entries.map((e) => e.quoted)).toEqual(['none', 'single', 'double', 'backtick']);
  });

  it('distinguishes an empty value from a missing key', () => {
    const { entries } = parse('A=');
    expect(entries).toEqual([{ key: 'A', value: '', line: 1, quoted: 'none' }]);
  });

  it('returns nothing for an empty file', () => {
    expect(parse('')).toEqual({ entries: [], problems: [] });
  });
});

const problemCases: [name: string, input: string, problems: Problem[], expected: Expected][] = [
  [
    'line without =',
    'A=1\nhello world\nB=2',
    [{ kind: 'invalid-line', line: 2 }],
    { A: '1', B: '2' },
  ],
  ['bare export', 'export A', [{ kind: 'invalid-line', line: 1 }], {}],
  ['key starting with a digit', '1A=x', [{ kind: 'invalid-line', line: 1 }], {}],
  ['missing key', '=x', [{ kind: 'invalid-line', line: 1 }], {}],
  ['colon syntax', 'A: 1', [{ kind: 'invalid-line', line: 1 }], {}],
  ['space inside key', 'MY KEY=1', [{ kind: 'invalid-line', line: 1 }], {}],
  [
    'text after closing quote',
    'A="x" junk\nB=2',
    [{ kind: 'invalid-line', line: 1, key: 'A' }],
    { B: '2' },
  ],
  [
    'unterminated double quote',
    'A=1\nB="abc\nC=3',
    [{ kind: 'unterminated-quote', line: 2, key: 'B' }],
    { A: '1', C: '3' },
  ],
  ['unterminated single quote', "B='abc", [{ kind: 'unterminated-quote', line: 1, key: 'B' }], {}],
  [
    'duplicate keys',
    'A=1\nB=2\nA=3\nA=4',
    [
      { kind: 'duplicate-key', line: 3, key: 'A', previousLine: 1 },
      { kind: 'duplicate-key', line: 4, key: 'A', previousLine: 3 },
    ],
    { A: '4', B: '2' },
  ],
  [
    'line numbers after CRLF multi-line value',
    'A="x\r\ny"\r\nbad\r\n',
    [{ kind: 'invalid-line', line: 3 }],
    { A: 'x\ny' },
  ],
];

describe('parse: problems', () => {
  it.each(problemCases)('%s', (_name, input, problems, expected) => {
    const result = parse(input);
    expect(result.problems).toEqual(problems);
    expect(values(result.entries)).toEqual(expected);
  });
});
