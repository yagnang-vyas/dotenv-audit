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

export type Severity = 'error' | 'warning' | 'note';

export type FindingId =
  | 'ENV001'
  | 'ENV002'
  | 'ENV003'
  | 'ENV004'
  | 'ENV005'
  | 'ENV006'
  | 'ENV007'
  | 'ENV008'
  | 'ENV009'
  | 'ENV010'
  | 'ENV011';

/**
 * One reported issue. There is intentionally no field for a value: findings
 * identify a file, line and key, and `message` describes the expectation.
 */
export interface Finding {
  id: FindingId;
  severity: Severity;
  file: string;
  /** 1-based line, or `null` when the finding is about the file as a whole. */
  line: number | null;
  key: string | null;
  message: string;
}

/** An env file's path (as given by the user) and its text. */
export interface SourceFile {
  path: string;
  text: string;
}
