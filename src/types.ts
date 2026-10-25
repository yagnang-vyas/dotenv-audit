/** How a value was quoted in the source file. */
export type QuoteStyle = 'none' | 'single' | 'double' | 'backtick';

/** One `KEY=value` assignment. `line` is 1-based and points at the key. */
export interface Entry {
  key: string;
  value: string;
  line: number;
  quoted: QuoteStyle;
}

export type ProblemKind = 'invalid-line' | 'unterminated-quote' | 'duplicate-key';

/**
 * Something wrong with the file's syntax. Deliberately has no field that could
 * hold a value or raw line content.
 */
export interface Problem {
  kind: ProblemKind;
  line: number;
  /** The key involved, when one could be identified. */
  key?: string;
  /** For `duplicate-key`: the line of the previous assignment of the same key. */
  previousLine?: number;
}

export interface ParseResult {
  entries: Entry[];
  problems: Problem[];
}
