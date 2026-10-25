/** Facts about the project, verified against the repository. */
export const REPO_URL = 'https://github.com/yagnang-vyas/dotenv-audit';
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const README_URL = `${REPO_URL}#readme`;
export const SPEC_URL = `${REPO_URL}/blob/main/SPEC.md`;
export const AGENTS_URL = `${REPO_URL}/blob/main/AGENTS.md`;
export const LICENSE_NAME = 'MIT';
export const COPYRIGHT = '© 2026 Yagnang Vyas';
export const VERSION: string = __VERSION__;

/** Install steps from README.md. The package is not published to npm yet. */
export const INSTALL_FROM_SOURCE = `git clone ${REPO_URL}.git
cd dotenv-audit
npm ci && npm run build && npm link
dotenv-audit --version`;

export const USAGE = `dotenv-audit check [--env .env] [--example .env.example] [--schema env.schema.json]
dotenv-audit diff <fileA> <fileB>
dotenv-audit scan [dir]`;

export interface CliExample {
  title: string;
  command: string;
  description: string;
}

/** Commands taken from README.md (sample output, CI and usage sections). */
export const CLI_EXAMPLES: readonly CliExample[] = [
  {
    title: 'Check against the example file',
    command: 'dotenv-audit check --env .env.sample-broken',
    description: 'With neither --example nor --schema, check compares against .env.example.',
  },
  {
    title: 'Validate types with a schema',
    command: 'dotenv-audit check --env .env.sample-broken --schema env.schema.json',
    description: 'Adds type and constraint checks (ENV004) and strict unknown-key handling.',
  },
  {
    title: 'Compare two environments',
    command: 'dotenv-audit diff .env.example .env.sample-broken',
    description:
      'Lists keys present in only one file and keys whose values differ, never the values.',
  },
  {
    title: 'Find committed env files',
    command: 'dotenv-audit scan',
    description: 'Lists env files tracked by git and checks that .gitignore covers .env.',
  },
  {
    title: 'Machine-readable output for CI',
    command: 'dotenv-audit check --env .env.example --schema env.schema.json --format json',
    description: 'Deterministic JSON report (schemaVersion 1) for scripts and pipelines.',
  },
];

export interface CliOption {
  flag: string;
  defaultValue: string;
  meaning: string;
}

export const CLI_OPTIONS: readonly CliOption[] = [
  { flag: '--env <path>', defaultValue: '.env', meaning: 'check: the env file to audit' },
  {
    flag: '--example <path>',
    defaultValue: '',
    meaning: 'check: example file listing expected keys',
  },
  { flag: '--schema <path>', defaultValue: '', meaning: 'check: typed JSON schema' },
  { flag: '--format text|json', defaultValue: 'text', meaning: 'Output format' },
  {
    flag: '--fail-on error|warning|never',
    defaultValue: 'error',
    meaning: 'Lowest severity that makes the exit code 1',
  },
  { flag: '-q, --quiet', defaultValue: 'off', meaning: 'Text format: findings only, no summary' },
  { flag: '-h, --help / -v, --version', defaultValue: '', meaning: 'Help / version' },
];

export const EXIT_CODES: readonly { code: number; meaning: string }[] = [
  { code: 0, meaning: 'No findings at or above --fail-on' },
  { code: 1, meaning: 'Findings at or above --fail-on' },
  { code: 2, meaning: 'Usage or input error (missing file, bad schema, not a git repository)' },
  { code: 130, meaning: 'Interrupted' },
];

export const SCHEMA_TYPES: readonly { type: string; accepts: string; extra: string }[] = [
  { type: 'string', accepts: 'any value', extra: 'minLength, maxLength, pattern' },
  { type: 'integer', accepts: 'optional sign and decimal digits', extra: 'min, max' },
  {
    type: 'number',
    accepts: 'a finite decimal number (no hex, Infinity or NaN)',
    extra: 'min, max',
  },
  { type: 'boolean', accepts: 'true, false, 1, 0, yes, no (any case)', extra: '' },
  { type: 'port', accepts: 'an integer from 1 to 65535', extra: '' },
  {
    type: 'url',
    accepts: 'anything the WHATWG URL parser accepts',
    extra: 'protocols (e.g. ["https"])',
  },
  { type: 'email', accepts: 'local@domain.tld, no whitespace (a pragmatic check)', extra: '' },
  { type: 'enum', accepts: 'one of values (case-sensitive)', extra: 'values' },
  { type: 'json', accepts: 'anything JSON.parse accepts', extra: '' },
];

export const LIMITATIONS: readonly string[] = [
  'Variable expansion is not performed: ${VAR} is an opaque, present value.',
  'The parser follows the dotenv package with a few deliberate differences: A=abc#def keeps the #, and unparseable lines are reported instead of skipped.',
  'The email check is deliberately simple and does not implement RFC 5322.',
  'scan only checks the .env path in the scanned directory for .gitignore coverage, and it needs git on PATH.',
  'Only .env.example, .env.sample and .env.template are allowed by scan; names like .env.local.example are reported.',
];
