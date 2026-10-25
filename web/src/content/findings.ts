import type { FindingId, Severity } from '../engine/audit.ts';

export interface FindingInfo {
  id: FindingId;
  title: string;
  /** Default severity, as documented in the README. */
  severity: Severity;
  command: 'check' | 'diff' | 'scan' | 'check, diff';
  /** Whether the playground can produce this finding. */
  inBrowser: boolean;
  explanation: string;
  remediation: string;
}

/** Documentation for each finding, written from README.md and SPEC.md. */
export const FINDINGS: readonly FindingInfo[] = [
  {
    id: 'ENV001',
    title: 'Required key missing',
    severity: 'error',
    command: 'check',
    inBrowser: true,
    explanation:
      'A key listed in the example file, or marked required in the schema (the default), is not set in the env file.',
    remediation:
      'Add the key to the env file. If it is genuinely optional, set "required": false for it in the schema.',
  },
  {
    id: 'ENV002',
    title: 'Unknown key',
    severity: 'warning',
    command: 'check',
    inBrowser: true,
    explanation:
      'The env file sets a key that is in neither the example file nor the schema. It is an error when the schema sets "allowUnknown": false.',
    remediation:
      'Remove the key if it is stale or misspelled, or document it by adding it to the example file or schema.',
  },
  {
    id: 'ENV003',
    title: 'Required key has an empty value',
    severity: 'error',
    command: 'check',
    inBrowser: true,
    explanation:
      'The key is present but its value is empty. An empty value for an optional schema variable counts as unset and is not reported.',
    remediation: 'Give the key a value, or mark it optional in the schema.',
  },
  {
    id: 'ENV004',
    title: 'Value fails a schema type or constraint',
    severity: 'error',
    command: 'check',
    inBrowser: true,
    explanation:
      'The value does not match the type or constraints the schema declares. The message states the expectation, never the value.',
    remediation:
      'Correct the value so it satisfies the expectation in the message, or adjust the schema if the expectation is wrong.',
  },
  {
    id: 'ENV005',
    title: 'Duplicate key',
    severity: 'warning',
    command: 'check, diff',
    inBrowser: true,
    explanation:
      'The same key is assigned more than once. As with the dotenv package, the last value wins, which is often not what was intended.',
    remediation: 'Delete the earlier assignment so the file has one definition per key.',
  },
  {
    id: 'ENV006',
    title: 'Unparseable line',
    severity: 'error',
    command: 'check, diff',
    inBrowser: true,
    explanation:
      'A line is not a valid KEY=value assignment, a quoted value is never closed, or text follows a closing quote. Only the line number is reported, because the line could contain a secret.',
    remediation:
      'Fix the syntax: use KEY=value, close the quote, or turn the line into a comment with #.',
  },
  {
    id: 'ENV007',
    title: 'Env file tracked by git',
    severity: 'error',
    command: 'scan',
    inBrowser: false,
    explanation:
      'An env file (other than .env.example, .env.sample or .env.template) is committed to the repository.',
    remediation:
      'Remove it from the index with git rm --cached, rotate any credentials it contained, and ignore it in .gitignore.',
  },
  {
    id: 'ENV008',
    title: '.env not covered by .gitignore',
    severity: 'warning',
    command: 'scan',
    inBrowser: false,
    explanation:
      '.env is not ignored by a .gitignore in the repository. A local or global exclude file does not count, because it is not shared with collaborators.',
    remediation: 'Add .env (or .env*) to the repository .gitignore.',
  },
  {
    id: 'ENV009',
    title: 'Placeholder value for a secret-looking key',
    severity: 'error',
    command: 'check',
    inBrowser: true,
    explanation:
      'A key that looks like a credential, or is marked "secret": true in the schema, still holds a placeholder such as changeme or <your-token>.',
    remediation: 'Replace the placeholder with the real secret from your secret store.',
  },
  {
    id: 'ENV010',
    title: 'Key present in only one file',
    severity: 'warning',
    command: 'diff',
    inBrowser: true,
    explanation: 'When comparing two env files, the key is set in one file but not the other.',
    remediation:
      'Add the key to the other environment, or remove it if it is no longer used. Some drift (for example debug-only keys) can be intentional.',
  },
  {
    id: 'ENV011',
    title: 'Value differs between files',
    severity: 'note',
    command: 'diff',
    inBrowser: true,
    explanation:
      'Both files set the key but to different values. Values are compared in memory and never shown. Notes never fail a run.',
    remediation:
      'Usually expected between environments. Review it when the value should be identical, for example a shared feature flag.',
  },
];

export const FINDINGS_BY_ID: ReadonlyMap<FindingId, FindingInfo> = new Map(
  FINDINGS.map((info) => [info.id, info]),
);
