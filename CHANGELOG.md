# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-25

### Added

- `check` command: audit an env file against an example file and/or a typed JSON
  schema (findings ENV001–ENV006 and ENV009).
- `diff` command: compare two env files without revealing values (ENV010,
  ENV011).
- `scan` command: find env files tracked by git and check `.gitignore` coverage
  of `.env` (ENV007, ENV008).
- dotenv-compatible parser with line numbers, multi-line values, escapes, BOM
  and CRLF support.
- Typed schema with `string`, `integer`, `number`, `boolean`, `port`, `url`,
  `email`, `enum` and `json` types and strict schema-file validation.
- Placeholder detection for secret-looking keys.
- Deterministic text and JSON (`schemaVersion` 1) reports, `--fail-on`, and exit
  codes 0, 1, 2 and 130.
- Privacy test suite guaranteeing no env value reaches stdout or stderr.
- Web playground and documentation site (`web/`, live at
  <https://dotenv-audit.netlify.app/>) that runs `check` and `diff` in the
  browser with the CLI's own engine.
