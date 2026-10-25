import type { Entry, ParseResult, Problem, QuoteStyle } from './types.js';

const ASSIGNMENT = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_.-]*)[ \t]*=/;
const QUOTES: Readonly<Record<string, QuoteStyle>> = {
  "'": 'single',
  '"': 'double',
  '`': 'backtick',
};
const DOUBLE_QUOTE_ESCAPES: Readonly<Record<string, string>> = {
  n: '\n',
  r: '\r',
  t: '\t',
  '"': '"',
  '\\': '\\',
};

/**
 * Parses dotenv text into entries with 1-based line numbers. Never throws;
 * syntax errors are returned as problems. See SPEC.md §1 for the rules.
 */
export function parse(text: string): ParseResult {
  const lines = normalise(text).split('\n');
  const entries: Entry[] = [];
  const problems: Problem[] = [];
  const seen = new Map<string, number>();

  let index = 0;
  while (index < lines.length) {
    const lineNumber = index + 1;
    const line = lines[index] ?? '';
    index += 1;

    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const match = ASSIGNMENT.exec(line);
    const key = match?.[1];
    if (match === null || key === undefined) {
      problems.push({ kind: 'invalid-line', line: lineNumber });
      continue;
    }

    // Leading whitespace stays on unquoted values so `KEY= # note` is a comment.
    const rest = line.slice(match[0].length);
    const start = rest.trimStart();
    const quoted = QUOTES[start.charAt(0)];
    let value: string;
    if (quoted === undefined) {
      value = unquoted(rest);
    } else {
      const result = quotedValue(start, quoted, lines, index);
      if (result.kind === 'unterminated') {
        problems.push({ kind: 'unterminated-quote', line: lineNumber, key });
        continue;
      }
      if (result.kind === 'trailing') {
        problems.push({ kind: 'invalid-line', line: lineNumber, key });
        index = result.nextIndex;
        continue;
      }
      value = result.value;
      index = result.nextIndex;
    }

    const previousLine = seen.get(key);
    if (previousLine !== undefined) {
      problems.push({ kind: 'duplicate-key', line: lineNumber, key, previousLine });
      const previous = entries.findIndex((entry) => entry.key === key);
      entries.splice(previous, 1);
    }
    seen.set(key, lineNumber);
    entries.push({ key, value, line: lineNumber, quoted: quoted ?? 'none' });
  }

  return { entries, problems };
}

function normalise(text: string): string {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return withoutBom.replace(/\r\n?/g, '\n');
}

/** An unquoted value ends at a `#` that follows whitespace; the rest is trimmed. */
function unquoted(rest: string): string {
  const comment = /[ \t]#/.exec(rest);
  return (comment === null ? rest : rest.slice(0, comment.index)).trim();
}

type QuotedResult =
  | { kind: 'ok'; value: string; nextIndex: number }
  | { kind: 'unterminated' }
  | { kind: 'trailing'; nextIndex: number };

/**
 * Reads a quoted value that starts at `rest[0]` and may continue onto the lines
 * from `nextIndex` onwards. A backslash before the quote character never closes
 * the value, matching the `dotenv` package.
 */
function quotedValue(
  rest: string,
  style: QuoteStyle,
  lines: readonly string[],
  nextIndex: number,
): QuotedResult {
  const quote = rest.charAt(0);
  let body = rest.slice(1);
  let index = nextIndex;
  for (;;) {
    const close = findClosingQuote(body, quote);
    if (close !== -1) {
      const trailing = body.slice(close + 1);
      if (!/^[ \t]*(?:#.*)?$/.test(trailing)) return { kind: 'trailing', nextIndex: index };
      const raw = body.slice(0, close);
      return { kind: 'ok', value: style === 'double' ? unescape(raw) : raw, nextIndex: index };
    }
    const next = lines[index];
    if (next === undefined) return { kind: 'unterminated' };
    body += `\n${next}`;
    index += 1;
  }
}

function findClosingQuote(body: string, quote: string): number {
  for (let i = 0; i < body.length; i += 1) {
    const char = body.charAt(i);
    if (char === '\\') {
      i += 1;
    } else if (char === quote) {
      return i;
    }
  }
  return -1;
}

function unescape(raw: string): string {
  return raw.replace(/\\(.)/gs, (sequence, char: string) => DOUBLE_QUOTE_ESCAPES[char] ?? sequence);
}
