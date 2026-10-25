# AGENTS.md

Ground rules for anyone (human or AI) changing this repository.

1. **Never print values.** No output format, error message or debug log may
   contain a value read from an env file. Findings name files, keys and line
   numbers only. The privacy test suite must keep passing.
2. **Zero runtime dependencies.** Use Node built-ins only. Any exception must be
   justified in `SPEC.md` under Decisions.
3. **Real functionality only.** No stubs or mocked behaviour presented as
   working. README sample output must come from actually running the CLI.
4. **Fix, don't weaken.** Never skip or weaken tests, lower coverage thresholds
   (90%), or add `@ts-ignore`, `eslint-disable` or `as any` without a one-line
   justification comment.
5. **Synthetic fixtures.** Test fixtures use obviously fake values.
6. **Shell safety.** External programs (git) run through `execFile` with an
   argument array, never through a shell.
7. **Conventional Commits**, and `npm run check` must pass before every commit.
8. **Ambiguity** → choose the most conservative interpretation and record it
   under "Decisions" in `SPEC.md`.
