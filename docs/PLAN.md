# dotenv-audit — Implementation Plan

This plan turns the project brief into a sequence of reviewable milestones. Each
milestone lands as one pull request whose CI (`npm run check`) must be green
before it merges. The detailed behavioural contract lives in `SPEC.md`; this
document covers order of work, architecture and how each piece is verified.

## Guiding principles

1. **Never print values.** Every finding, error message and log line names keys,
   files and line numbers only. A dedicated privacy test suite guards this for
   every command and output format.
2. **Zero runtime dependencies.** Only Node built-ins (`node:util` `parseArgs`,
   `node:fs`, `node:child_process` `execFile`). Dev tooling is unrestricted.
3. **Deterministic output.** Findings are sorted (file, line, ID, key) so text
   and JSON reports are byte-for-byte reproducible.
4. **Real functionality only.** No stubs; README sample output is captured from
   running the built CLI against `examples/`.
5. **Strict typing.** `strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`; no `any` or `@ts-ignore` without a justified
   comment.

## Toolchain

| Concern     | Choice                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Runtime     | Node >= 22 (CI matrix: 22, 24), ESM                                                                 |
| Language    | TypeScript (strict)                                                                                 |
| Build       | `tsup` → `dist/cli.js` (+ `dist/index.js` library entry, `.d.ts`) with `#!/usr/bin/env node` banner |
| Tests       | `vitest` + `@vitest/coverage-v8`, 90% thresholds on lines/branches/functions/statements             |
| Lint/format | ESLint flat config + `typescript-eslint` type-aware rules, Prettier                                 |
| Packaging   | `publint`, `npm pack --dry-run` ships only `dist/`, README, LICENSE, package.json                   |
| CI          | GitHub Actions, `push` + `pull_request`, `permissions: contents: read`, concurrency cancel          |

`npm run check` = typecheck → lint → build → test → publint.

## Architecture

```
src/
  cli.ts           # argv parsing (parseArgs), subcommand dispatch, exit codes, SIGINT → 130
  index.ts         # public library API (parse, check, diff, scan, reports)
  parse.ts         # dotenv parser → { entries, problems } with line numbers
  schema.ts        # schema file loading, strict schema validation, value validators
  placeholders.ts  # secret-looking key + placeholder value detection
  check.ts         # env vs example and/or schema → findings
  diff.ts          # value-free comparison of two env files → findings + counts
  scan.ts          # git ls-files / git check-ignore via execFile → findings
  report/text.ts   # human report
  report/json.ts   # machine report (schemaVersion 1)
  types.ts         # Entry, Problem, Finding, Severity, Report…
  errors.ts        # UsageError (exit 2) with value-free messages
```

Data flow: **files → parser → (check | diff | scan) → Finding[] → sort →
report → exit code**. Commands are pure functions over parsed input (except
`scan`, which shells out to git through `execFile` with an argument array, never
a shell). The CLI is a thin layer that reads files, maps `UsageError` to exit 2
and computes the exit code from `--fail-on`.

Privacy is enforced structurally: a `Finding` has no field that can carry a
value, and the parser's `Problem` type stores only line numbers and a reason
code. Values exist only inside `Entry` and are consumed by validators that
return messages describing the _expectation_ (e.g. "expected an integer between
1 and 65535").

### Findings

| ID     | Severity                                 | Meaning                                    |
| ------ | ---------------------------------------- | ------------------------------------------ |
| ENV001 | error                                    | Required key missing                       |
| ENV002 | warning (error if `allowUnknown: false`) | Key not in example/schema                  |
| ENV003 | error                                    | Required key has an empty value            |
| ENV004 | error                                    | Value fails schema type/constraint         |
| ENV005 | warning                                  | Duplicate key                              |
| ENV006 | error                                    | Unparseable line or unterminated quote     |
| ENV007 | error                                    | Env file tracked by git                    |
| ENV008 | warning                                  | `.env` not covered by `.gitignore`         |
| ENV009 | error                                    | Placeholder value for a secret-looking key |
| ENV010 | warning                                  | `diff`: key present in only one file       |
| ENV011 | note                                     | `diff`: value differs between files        |

Exit codes: `0` clean (relative to `--fail-on`), `1` findings at/above
`--fail-on`, `2` usage/input error (`dotenv-audit: error: <message>`, no stack
trace), `130` interrupted.

## Milestones

Each milestone = one PR, one Conventional Commit, `npm run check` green.

### M0 — Scaffold (`chore: scaffold project`)

- `package.json` (bin, exports, types, files, engines, scripts, `prepare` build),
  `package-lock.json`, `tsconfig.json`, `eslint.config.js`, Prettier config,
  `vitest.config.ts`, `tsup.config.ts`, `.gitignore`, `.editorconfig`.
- `.github/workflows/ci.yml` (Node 22/24 matrix).
- `LICENSE` (MIT, 2026 Yagnang Vyas), `SPEC.md` (with Decisions), `AGENTS.md`.
- Minimal `cli.ts` supporting `--version` / `--help` with tests.

### M1 — Parser (`feat: add dotenv parser`)

- `parse.ts` implementing brief §3.1: `export` prefix, key grammar, trimming,
  inline ` #` comments, single/double/backtick quotes, multi-line quoted values,
  double-quote escapes, empty values, BOM, CRLF.
- Problems: invalid line, unterminated quote (opening line), duplicate key
  (last wins).
- Table-driven unit tests plus a compatibility suite comparing results with the
  real `dotenv` package (devDependency only). Intentional differences documented
  in SPEC.md.

### M2 — Typed schema (`feat: add typed schema validation`)

- Strict schema-file validation (unknown properties, wrong types, `min > max`,
  invalid regex, bad enum lists) with JSON-path messages → `UsageError`.
- Validators for `string`, `integer`, `number`, `boolean`, `port`, `url`
  (+`protocols`), `email`, `enum`, `json`; constraints `minLength`,
  `maxLength`, `pattern`, `min`, `max`; `required`, `secret`.
- Tests for each type's valid/invalid cases and each schema error path.

### M3 — Commands (`feat: add check, diff and scan commands`)

- `placeholders.ts`: secret-looking key regex + `secret: true`; placeholder
  patterns (`changeme`, `change_me`, `your_*_here`, `xxx+`, `todo`,
  `replace_me`, `secret`, `password`, `<...>`), case-insensitive.
- `check.ts`: example mode and/or schema mode → ENV001–ENV006, ENV009.
- `diff.ts`: only-in-A / only-in-B (ENV010), differing values (ENV011),
  identical-key count; values compared in memory only.
- `scan.ts`: `git rev-parse`, `git ls-files`, `git check-ignore` via `execFile`;
  ENV007/ENV008; non-repo → `UsageError`.
- Fixture-driven tests for every finding ID; scan tests build temporary git
  repos with a repo-local identity.

### M4 — CLI and reports (`feat: add CLI and reports`)

- Subcommands `check`, `diff`, `scan`; flags `--env`, `--example`, `--schema`,
  `--format text|json`, `--fail-on error|warning|never`, `--quiet`,
  `--version`, `--help`.
- Text report (`path:line  severity  ID  KEY: message` + summary) and JSON report
  (`schemaVersion`, `tool`, `command`, `findings`, `summary`), deterministic.
- Integration tests spawning `node dist/cli.js` for every exit code and format.
- Privacy suite: fixtures with values like `fake-secret-value-123`; assert the
  value never appears in stdout/stderr for any command/format, including files
  with parse errors.

### M5 — Docs and examples (`docs: add README, examples and changelog`)

- `examples/.env.example`, `examples/.env.sample-broken`,
  `examples/env.schema.json`.
- README in the brief's section order, with sample output captured from the
  built CLI; GitHub Actions usage snippet; JSON report schema; privacy
  guarantees; limitations; prior art; roadmap.
- `CHANGELOG.md` (`0.1.0 - 2026-10-25`).

### M6 — Self-review (`fix:` / `refactor:`)

- Audit for long functions, broad `catch` blocks, any path that could leak a
  value (including error messages from `JSON.parse`, `RegExp`, `URL`).
- Re-run every README command; check `npm pack --dry-run` contents.

## Definition of done

- `npm run check` passes on Node 22 and 24 with ≥ 90% coverage.
- Privacy suite passes for every command and format.
- Package ships only `dist/`, README, LICENSE, package.json.
- README output is real and every documented command works.

## Deviations from the brief

- The brief was written for a local-only agent ("never add a remote or push").
  Since the repository is connected, milestones are delivered as pull requests
  instead of local-only commits. Nothing is published to npm.
