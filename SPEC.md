# dotenv-audit specification

This document is the behavioural contract for dotenv-audit 0.1.0. When code and
this document disagree, one of them is a bug. Choices made where the original
brief was silent or ambiguous are recorded under [Decisions](#decisions).

## Core promise

No output format, error message or log line ever contains a value read from an
env file. Findings identify a file, a line number, a finding ID and a key name.
Validation messages describe the _expectation_ ("expected an integer between 1
and 65535"), never the actual value.

## Scope

In scope: parsing dotenv files, checking them against an example file and/or a
typed JSON schema, comparing two env files without revealing values, detecting
env files tracked by git and checking `.gitignore` coverage.

Non-goals for 0.1.0: variable expansion (`${VAR}` is an opaque, present value),
loading variables into `process.env`, secret-manager integrations, generating
typed loaders, publishing to npm or the GitHub Marketplace.

## Runtime

- Node.js 22 or newer. ESM. Zero runtime dependencies (Node built-ins only).
- Git (any version supporting `ls-files -z` and `check-ignore`) is needed only
  for `scan`.

## 1. Parser

`parse(text)` returns `{ entries, problems }`.

- `Entry = { key, value, line, quoted }`, `quoted` is `'none' | 'single' | 'double' | 'backtick'`.
- `Problem = { kind, line, key? }`, `kind` is `'invalid-line' | 'unterminated-quote' | 'duplicate-key'`.

Rules (following the `dotenv` package unless listed under Decisions):

1. A UTF-8 BOM at the start of the file is ignored. `\r\n` and `\r` line endings
   are normalised to `\n`.
2. Blank lines and lines whose first non-space character is `#` are ignored.
3. An assignment is `[export ]KEY=VALUE`. Whitespace around `=` and before the
   key is tolerated. Keys match `[A-Za-z_][A-Za-z0-9_.-]*`.
4. Unquoted values are trimmed. A `#` preceded by whitespace starts an inline
   comment; a `#` with no preceding whitespace is part of the value.
5. Single-quoted and backtick-quoted values are literal. Double-quoted values
   expand `\n`, `\r`, `\t`, `\"` and `\\`.
6. Quoted values may span multiple lines until the matching closing quote. An
   unterminated quote is a problem reported at the opening line.
7. `KEY=` and `KEY=""` produce an entry with an empty value, which is distinct
   from a missing key.
8. A duplicate key is a problem at the later line; the last value wins.
9. Any other non-blank, non-comment line is an `invalid-line` problem.

## 2. Schema file

```json
{
  "variables": {
    "DATABASE_URL": { "type": "url", "protocols": ["postgres", "postgresql"] },
    "PORT": { "type": "port", "required": false },
    "NODE_ENV": { "type": "enum", "values": ["development", "test", "production"] },
    "DEBUG": { "type": "boolean", "required": false },
    "API_KEY": { "type": "string", "secret": true, "minLength": 20, "pattern": "^sk_" },
    "WORKERS": { "type": "integer", "min": 1, "max": 64 },
    "ADMIN_EMAIL": { "type": "email" }
  },
  "allowUnknown": false
}
```

Common properties for every variable: `type` (required), `required` (boolean,
default `true`), `secret` (boolean, default `false`), `description` (string,
ignored by validation).

| Type      | Accepts                                                     | Extra properties                       |
| --------- | ----------------------------------------------------------- | -------------------------------------- |
| `string`  | any value                                                   | `minLength`, `maxLength`, `pattern`    |
| `integer` | optional sign and decimal digits                            | `min`, `max`                           |
| `number`  | a finite decimal number (no hex, no `Infinity`, no `NaN`)   | `min`, `max`                           |
| `boolean` | `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive)   |                                        |
| `port`    | an integer from 1 to 65535                                  |                                        |
| `url`     | anything WHATWG `URL` parses                                | `protocols` (scheme names without `:`) |
| `email`   | `local@domain.tld`: no whitespace, one `@`, a dot in domain |                                        |
| `enum`    | one of `values` (case-sensitive)                            | `values` (non-empty string array)      |
| `json`    | anything `JSON.parse` accepts                               |                                        |

The schema file is validated strictly. Unknown properties, wrong property
types, a property used with the wrong type (e.g. `protocols` on `integer`),
`min > max`, `minLength > maxLength`, an empty or duplicated `values` list and
an invalid `pattern` are usage errors whose message includes a JSON path, e.g.
`env.schema.json: $.variables.PORT.min: expected a number`.

## 3. Commands

### `check`

```
dotenv-audit check [--env .env] [--example .env.example] [--schema env.schema.json]
```

Validates `--env` (default `.env`). With `--schema`, validates against the
schema. With `--example`, compares against the example file. Both may be given.
With neither, `--example` defaults to `.env.example`.

### `diff`

```
dotenv-audit diff <fileA> <fileB>
```

Lists keys only in A, keys only in B, keys whose values differ and the count of
identical keys. Values are never shown and there is no option to show them.

### `scan`

```
dotenv-audit scan [dir]
```

Inside the git repository containing `dir` (default `.`), lists tracked files
named `.env` or `.env.*` (at any depth under `dir`), excluding `.env.example`,
`.env.sample` and `.env.template`, and checks that `.gitignore` rules ignore
`<dir>/.env`. Git runs through `execFile`, never a shell. Outside a git
repository, `scan` is a usage error.

### Common options

| Option                            | Default | Meaning                                      |
| --------------------------------- | ------- | -------------------------------------------- |
| `--format text\|json`             | `text`  | Output format                                |
| `--fail-on error\|warning\|never` | `error` | Lowest severity that makes the exit code 1   |
| `-q`, `--quiet`                   | off     | Text format: print findings only, no summary |
| `-v`, `--version`                 |         | Print the version                            |
| `-h`, `--help`                    |         | Print help                                   |

## 4. Findings

| ID     | Severity | Meaning                                                                     |
| ------ | -------- | --------------------------------------------------------------------------- |
| ENV001 | error    | Required key missing                                                        |
| ENV002 | warning  | Key not in example/schema (error if the schema has `"allowUnknown": false`) |
| ENV003 | error    | Required key has an empty value                                             |
| ENV004 | error    | Value fails a schema type or constraint                                     |
| ENV005 | warning  | Duplicate key                                                               |
| ENV006 | error    | Unparseable line or unterminated quote                                      |
| ENV007 | error    | Env file tracked by git                                                     |
| ENV008 | warning  | `.env` not covered by `.gitignore`                                          |
| ENV009 | error    | Placeholder value for a secret-looking key                                  |
| ENV010 | warning  | `diff`: key present in only one file                                        |
| ENV011 | note     | `diff`: value differs between files                                         |

A key is _secret-looking_ if the schema marks it `"secret": true` or its name
matches `/(PASS(WORD)?|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i`.

A value is a _placeholder_ if, case-insensitively and after trimming, it is
`changeme`, `change_me`, `todo`, `replace_me`, `secret`, `password`, three or
more `x` characters, `your_<anything>_here` (with `_` or `-` separators), or is
wrapped in angle brackets (`<...>`).

## 5. Exit codes

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| 0    | No findings at or above `--fail-on`                               |
| 1    | Findings at or above `--fail-on`                                  |
| 2    | Usage or input error, printed as `dotenv-audit: error: <message>` |
| 130  | Interrupted (SIGINT)                                              |

## 6. Output

Text:

```
.env:4  error  ENV004  PORT: expected an integer between 1 and 65535
1 error, 0 warnings, 0 notes
```

Findings without a line (for example ENV001) print the path alone. With no
findings the summary is `no findings`. `diff` adds a counts line before the
summary: `a.env vs b.env: 1 only in a.env, 1 only in b.env, 2 different, 2 identical`.
`--quiet` drops both summary lines, so a clean run prints nothing.

JSON (`schemaVersion` 1):

```json
{
  "schemaVersion": 1,
  "tool": { "name": "dotenv-audit", "version": "0.1.0" },
  "command": "check",
  "findings": [
    {
      "id": "ENV004",
      "severity": "error",
      "file": ".env",
      "line": 4,
      "key": "PORT",
      "message": "expected an integer between 1 and 65535"
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "notes": 0 }
}
```

`diff` adds `"diff": { "onlyInA": n, "onlyInB": n, "different": n, "identical": n }`.

Findings are sorted by file, line (findings without a line first), ID and key,
so both formats are deterministic.

## Decisions

Recorded where the brief was silent or ambiguous. The most conservative reading
was chosen unless noted.

1. **Delivery.** The brief says never add a remote or push. The repository was
   connected by the author, so milestones are delivered as pull requests. Nothing
   is published to npm.
2. **Parser differences from `dotenv`.** These follow the brief and are pinned
   by `test/unit/parse-compat.test.ts`; everything else matches `dotenv` 18:
   - `dotenv` silently skips lines it cannot parse; dotenv-audit reports them
     (ENV006), because a silently ignored line is usually a mistake. This covers
     keys starting with a digit, `KEY: value` colon syntax and lines without `=`.
   - In an unquoted value, `#` starts a comment only after whitespace
     (`A=abc#def` keeps `abc#def`); `dotenv` cuts at any `#`.
   - Double-quoted values also expand `\t`, `\"` and `\\`; `dotenv` expands only
     `\n` and `\r`.
   - An unterminated quote, or text after a closing quote, is a problem and
     produces no entry; `dotenv` falls back to the raw text.
3. **Problem messages never quote the line.** An unparseable line may contain a
   value, so ENV006 reports only the line number and the reason.
4. **Duplicates.** ENV005 is reported at every later occurrence; the last value
   wins, matching `dotenv`.
5. **Example mode requires every example key.** A key in the example file that
   is missing from the env file is ENV001; present but empty is ENV003.
6. **Example and schema together.** Required keys are the union of the example's
   keys and the schema's required keys; a schema `"required": false` makes an
   example key optional. Types come from the schema. A key is unknown (ENV002)
   only if it is in neither.
7. **`allowUnknown` defaults to `true`**, so unknown keys are warnings unless the
   schema opts into strictness.
8. **Empty optional values.** An empty value for an optional schema variable is
   treated as unset and not type-checked. An empty value for a required one is
   ENV003, not ENV004.
9. **Placeholders are checked only in the audited env file**, not in the example
   (example files are expected to contain placeholders).
10. **`diff` compares parsed values**, so `KEY=a` and `KEY="a"` are identical.
11. **`scan` excludes exactly** `.env.example`, `.env.sample` and
    `.env.template`. Names like `.env.local.example` are reported, because a
    false positive is cheaper than a leaked secret.
12. **Paths in reports** are printed as the user passed them, never
    absolutised. `scan` joins the directory argument with the path git reports
    relative to it (`scan apps/web` → `apps/web/.env.local`).
13. **Only `.gitignore` counts for ENV008.** `.git/info/exclude` and global
    excludes protect only one machine, so a `.env` ignored only by them is still
    ENV008 (with a message saying so). A negated rule (`!.env`) is not ignored.
14. **A key whose line failed to parse is not also reported missing.** ENV006
    already covers it; reporting ENV001 too would double-count one mistake.
15. **Schema details.** `pattern` is an unanchored JavaScript regular
    expression compiled with the `u` flag (anchor it with `^…$` yourself).
    `minLength`/`maxLength` count Unicode code points. `protocols` match
    case-insensitively. `port` accepts plain digits only (no sign). A top-level
    `$schema` string is allowed so editors can attach a JSON Schema. The email
    check is deliberately simple: no whitespace, exactly one `@`, and a domain
    containing a dot with non-empty labels.
16. **`--fail-on` has no `note` level.** Only `error`,
    `warning` and `never` are accepted, as in the brief; notes (ENV011) never
    fail a run.
17. **Interrupts.** The CLI does its I/O asynchronously so a SIGINT handler can
    run and exit with 130.
18. **Unexpected internal errors** print `dotenv-audit: error: unexpected
internal error` and exit 2, because a raw exception message could include
    file content.
