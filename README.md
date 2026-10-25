# dotenv-audit

[![CI](https://github.com/yagnang-vyas/dotenv-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/yagnang-vyas/dotenv-audit/actions/workflows/ci.yml)

Audit `.env` files against an example file or a typed schema, compare
environments without revealing values, and catch env files committed to git.
A zero-dependency Node.js CLI with CI-friendly exit codes and JSON output.

## Why

Deployments fail because `.env` lacks a key that `.env.example` has, a value has
the wrong type (`PORT=three-thousand`), a placeholder (`changeme`) shipped to
production, or staging and production quietly drifted apart. Teams also commit
`.env` files by accident. dotenv-audit checks all of that from the outside, in
CI or before a deploy, and **never prints a value** while doing it.

## Features

- **`check`** an env file against `.env.example` (missing, empty, unknown and
  duplicate keys) and/or a typed JSON schema (`string`, `integer`, `number`,
  `boolean`, `port`, `url`, `email`, `enum`, `json` with constraints).
- **Placeholder detection** for secret-looking keys (`API_KEY=changeme`,
  `DB_PASSWORD=<your-password>`).
- **`diff`** two env files: keys only in one, keys whose values differ, and how
  many are identical. Values are never shown, and there is no flag to show them.
- **`scan`** a git repository for tracked env files and check that `.gitignore`
  covers `.env`.
- Deterministic **text and JSON** reports, `--fail-on` thresholds and
  meaningful **exit codes** for CI.
- A **dotenv-compatible parser** with line numbers: `export`, quotes, multi-line
  values, escapes, inline comments, BOM and CRLF.
- **Zero runtime dependencies**, strict TypeScript, Node.js 22+.

## Install

dotenv-audit is not published to npm yet. Install it from a clone:

```sh
git clone https://github.com/yagnang-vyas/dotenv-audit.git
cd dotenv-audit
npm ci && npm run build && npm link
dotenv-audit --version
```

Once the repository is public you can also run it straight from GitHub (the
`prepare` script builds it on install):

```sh
npx github:yagnang-vyas/dotenv-audit check
```

## Usage

```
dotenv-audit check [--env .env] [--example .env.example] [--schema env.schema.json]
dotenv-audit diff <fileA> <fileB>
dotenv-audit scan [dir]
```

| Option                             | Default | Meaning                                     |
| ---------------------------------- | ------- | ------------------------------------------- |
| `--env <path>`                     | `.env`  | `check`: the env file to audit              |
| `--example <path>`                 |         | `check`: example file listing expected keys |
| `--schema <path>`                  |         | `check`: typed JSON schema                  |
| `--format text\|json`              | `text`  | Output format                               |
| `--fail-on error\|warning\|never`  | `error` | Lowest severity that makes the exit code 1  |
| `-q`, `--quiet`                    | off     | Text format: findings only, no summary      |
| `-h`, `--help` / `-v`, `--version` |         | Help / version                              |

### `check`

Compares `--env` with `--example`, validates it against `--schema`, or both.
With neither option it uses `.env.example`. Every key in the example file is
required; the schema decides which keys are optional and what type each value
must have.

### `diff`

Compares the keys of two files, for example staging and production. Findings
point at the line of each key in the file where it appears.

### `scan`

Lists env files tracked by git under `dir` (default: the current directory) and
checks that `.gitignore` ignores `<dir>/.env`. `.env.example`, `.env.sample`
and `.env.template` are allowed. Running it outside a git repository is a usage
error.

## Sample output

These are real runs against the files in [`examples/`](examples).

```console
$ cd examples
$ dotenv-audit check --env .env.sample-broken
.env.sample-broken  error  ENV001  ADMIN_EMAIL: required key is missing
.env.sample-broken  error  ENV001  DEBUG: required key is missing
.env.sample-broken:4  error  ENV003  NODE_ENV: required key has an empty value
.env.sample-broken:5  error  ENV009  API_KEY: placeholder value for a secret-looking key
.env.sample-broken:7  warning  ENV005  WORKERS: duplicate key (also set on line 6); the last value wins
.env.sample-broken:8  warning  ENV002  FEATURE_FLAGS: key is not defined in the example file
.env.sample-broken:9  error  ENV006  line is not a valid KEY=value assignment
5 errors, 2 warnings, 0 notes
```

```console
$ dotenv-audit check --env .env.sample-broken --schema env.schema.json
.env.sample-broken  error  ENV001  ADMIN_EMAIL: required key is missing
.env.sample-broken:2  error  ENV004  DATABASE_URL: expected a URL with protocol postgres or postgresql
.env.sample-broken:3  error  ENV004  PORT: expected an integer between 1 and 65535
.env.sample-broken:4  error  ENV003  NODE_ENV: required key has an empty value
.env.sample-broken:5  error  ENV004  API_KEY: expected at least 20 characters
.env.sample-broken:5  error  ENV009  API_KEY: placeholder value for a secret-looking key
.env.sample-broken:7  error  ENV004  WORKERS: expected an integer between 1 and 64
.env.sample-broken:7  warning  ENV005  WORKERS: duplicate key (also set on line 6); the last value wins
.env.sample-broken:8  error  ENV002  FEATURE_FLAGS: key is not defined in the schema
.env.sample-broken:9  error  ENV006  line is not a valid KEY=value assignment
9 errors, 1 warning, 0 notes
```

```console
$ dotenv-audit diff .env.example .env.sample-broken
.env.example:2  note  ENV011  DATABASE_URL: value differs from .env.sample-broken (line 2)
.env.example:3  note  ENV011  PORT: value differs from .env.sample-broken (line 3)
.env.example:4  note  ENV011  NODE_ENV: value differs from .env.sample-broken (line 4)
.env.example:5  warning  ENV010  DEBUG: key is missing from .env.sample-broken
.env.example:6  note  ENV011  API_KEY: value differs from .env.sample-broken (line 5)
.env.example:7  note  ENV011  WORKERS: value differs from .env.sample-broken (line 7)
.env.example:8  warning  ENV010  ADMIN_EMAIL: key is missing from .env.sample-broken
.env.sample-broken:7  warning  ENV005  WORKERS: duplicate key (also set on line 6); the last value wins
.env.sample-broken:8  warning  ENV010  FEATURE_FLAGS: key is missing from .env.example
.env.sample-broken:9  error  ENV006  line is not a valid KEY=value assignment
.env.example vs .env.sample-broken: 2 only in .env.example, 1 only in .env.sample-broken, 5 different, 0 identical
1 error, 4 warnings, 5 notes
```

`scan` in a small demo repository where `.env.production` and `apps/api/.env`
were added and `.gitignore` only lists `node_modules/`:

```console
$ dotenv-audit scan
.env  warning  ENV008  .env is not ignored by .gitignore
.env.production  error  ENV007  env file is tracked by git
apps/api/.env  error  ENV007  env file is tracked by git
2 errors, 1 warning, 0 notes
```

Usage errors exit with code 2 and never print a stack trace:

```console
$ dotenv-audit check --env nope.env
dotenv-audit: error: cannot read nope.env: file not found
```

## Schema reference

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

Every variable takes `type` and optionally `required` (default `true`),
`secret` (default `false`, marks the key for placeholder detection) and
`description`.

| Type      | Accepts                                               | Extra properties                    |
| --------- | ----------------------------------------------------- | ----------------------------------- |
| `string`  | any value                                             | `minLength`, `maxLength`, `pattern` |
| `integer` | optional sign and decimal digits                      | `min`, `max`                        |
| `number`  | a finite decimal number (no hex, `Infinity` or `NaN`) | `min`, `max`                        |
| `boolean` | `true`, `false`, `1`, `0`, `yes`, `no` (any case)     |                                     |
| `port`    | an integer from 1 to 65535                            |                                     |
| `url`     | anything the WHATWG `URL` parser accepts              | `protocols` (e.g. `["https"]`)      |
| `email`   | `local@domain.tld`, no whitespace (a pragmatic check) |                                     |
| `enum`    | one of `values` (case-sensitive)                      | `values`                            |
| `json`    | anything `JSON.parse` accepts                         |                                     |

`pattern` is an unanchored JavaScript regular expression (add `^…$` yourself).
`allowUnknown` (default `true`) controls whether keys missing from the schema
are warnings or errors. An empty value for an optional variable counts as unset.

The schema file itself is validated strictly: unknown properties, wrong types,
`min > max` and invalid regular expressions are usage errors that name the JSON
path, for example `env.schema.json: $.variables.PORT.min: expected a number`.

## Findings

| ID     | Severity | Meaning                                                                     |
| ------ | -------- | --------------------------------------------------------------------------- |
| ENV001 | error    | Required key missing                                                        |
| ENV002 | warning  | Key not in example/schema (error if the schema has `"allowUnknown": false`) |
| ENV003 | error    | Required key has an empty value                                             |
| ENV004 | error    | Value fails a schema type or constraint                                     |
| ENV005 | warning  | Duplicate key (the last value wins)                                         |
| ENV006 | error    | Unparseable line or unterminated quote                                      |
| ENV007 | error    | Env file tracked by git                                                     |
| ENV008 | warning  | `.env` not covered by `.gitignore`                                          |
| ENV009 | error    | Placeholder value for a secret-looking key                                  |
| ENV010 | warning  | `diff`: key present in only one file                                        |
| ENV011 | note     | `diff`: value differs between files                                         |

A key is secret-looking if the schema marks it `"secret": true` or its name
contains `PASS`, `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`/`APIKEY`,
`PRIVATE_KEY`/`PRIVATEKEY` or `CREDENTIAL` (any case). Placeholders are
`changeme`, `change_me`, `todo`, `replace_me`, `secret`, `password`, `xxx` (three
or more), `your_…_here` and anything in angle brackets, ignoring case.

## CI

```yaml
# .github/workflows/env-audit.yml
name: Env audit
on: [push, pull_request]
permissions:
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dotenv-audit
        run: |
          git clone --depth 1 https://github.com/yagnang-vyas/dotenv-audit.git "$RUNNER_TEMP/dotenv-audit"
          cd "$RUNNER_TEMP/dotenv-audit" && npm ci && npm run build && npm link
      - name: No env files committed
        run: dotenv-audit scan
      # In a deploy job, audit the env file rendered from your secret store:
      # - run: dotenv-audit check --env .env.production --schema env.schema.json
```

## JSON output

`--format json` prints one object. Keys always appear in this order, findings
are sorted by file, line, ID and key, and the output is identical across runs.
A real run from `examples/` (the example file's placeholder fails the schema):

```console
$ dotenv-audit check --env .env.example --schema env.schema.json --format json
{
  "schemaVersion": 1,
  "tool": {
    "name": "dotenv-audit",
    "version": "0.1.0"
  },
  "command": "check",
  "findings": [
    {
      "id": "ENV004",
      "severity": "error",
      "file": ".env.example",
      "line": 6,
      "key": "API_KEY",
      "message": "expected at least 20 characters"
    },
    {
      "id": "ENV009",
      "severity": "error",
      "file": ".env.example",
      "line": 6,
      "key": "API_KEY",
      "message": "placeholder value for a secret-looking key"
    }
  ],
  "summary": {
    "errors": 2,
    "warnings": 0,
    "notes": 0
  }
}
```

| Field                 | Type                                         |
| --------------------- | -------------------------------------------- |
| `schemaVersion`       | `1`; bumped on any breaking change           |
| `tool`                | `{ name, version }`                          |
| `command`             | `"check"`, `"diff"` or `"scan"`              |
| `findings[].id`       | `"ENV001"` … `"ENV011"`                      |
| `findings[].severity` | `"error"`, `"warning"` or `"note"`           |
| `findings[].file`     | path as given on the command line            |
| `findings[].line`     | 1-based line number, or `null` for the file  |
| `findings[].key`      | variable name, or `null`                     |
| `findings[].message`  | human-readable expectation, never a value    |
| `summary`             | `{ errors, warnings, notes }`                |
| `diff` (diff only)    | `{ onlyInA, onlyInB, different, identical }` |

## Exit codes

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| 0    | No findings at or above `--fail-on`                                   |
| 1    | Findings at or above `--fail-on`                                      |
| 2    | Usage or input error (missing file, bad schema, not a git repository) |
| 130  | Interrupted                                                           |

## Privacy guarantees

- No report, error message or log line contains a value read from an env file.
  Findings name the file, line, key and the expectation that failed.
- Unparseable lines are reported by line number only, because the line could
  contain a secret.
- `diff` compares values in memory and has no option to reveal them.
- Invalid JSON in a schema file is reported as `invalid JSON` without echoing
  the engine's message, which would quote the input.
- Unexpected internal errors print `unexpected internal error` rather than a
  stack trace.
- A dedicated test suite runs every command and format against fixtures full of
  marker values and fails if any marker reaches stdout or stderr.

## Limitations

- Variable expansion is not performed: `${VAR}` is an opaque, present value.
- The parser follows the `dotenv` package with a few deliberate differences (for
  example, `A=abc#def` keeps the `#`, and unparseable lines are reported instead
  of skipped). See the Decisions section of [SPEC.md](SPEC.md).
- The email check is deliberately simple and does not implement RFC 5322.
- `scan` only checks the `.env` path in the scanned directory for `.gitignore`
  coverage, and it needs `git` on `PATH`.
- `.env.local.example` and similar names are reported by `scan`; only
  `.env.example`, `.env.sample` and `.env.template` are allowed. This repository
  intentionally tracks `examples/.env.sample-broken`, so `scan` reports it here.

## Prior art

- [dotenv-linter](https://github.com/dotenv-linter/dotenv-linter) (Rust) lints
  the style of a single file.
- [envalid](https://github.com/af/envalid) and
  [@t3-oss/env](https://github.com/t3-oss/t3-env) validate variables at runtime,
  inside the application.

dotenv-audit works from the outside, across files, with CI exit codes and a
value-free diff.

## Web playground

[`web/`](web) holds a static site with an interactive playground and
documentation. It runs this package's own `check` and `diff` engine in the
browser, so nothing is uploaded, and deploys to Netlify with the root
[`netlify.toml`](netlify.toml). `scan` needs git and stays CLI-only. See
[web/README.md](web/README.md).

## Development

```sh
npm ci
npm run check   # typecheck, lint, build, test with coverage, publint
```

| Script              | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run build`     | Bundle `src/` to `dist/` with tsup  |
| `npm run typecheck` | `tsc --noEmit` in strict mode       |
| `npm run lint`      | ESLint (type-aware) and Prettier    |
| `npm test`          | Vitest with 90% coverage thresholds |

See [SPEC.md](SPEC.md) for the behavioural contract and
[AGENTS.md](AGENTS.md) for contribution ground rules.

## Roadmap

- Publish to npm.
- Optional `${VAR}` expansion checks (undefined references).
- A reusable GitHub Action.
- SARIF output for code-scanning integrations.

## License

[MIT](LICENSE) © 2026 Yagnang Vyas
