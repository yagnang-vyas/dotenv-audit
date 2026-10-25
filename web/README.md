# dotenv-audit web playground

A static site with an interactive playground and documentation for
[dotenv-audit](../README.md). It runs the CLI's own audit engine in the browser.

## How it works

- **Same engine as the CLI.** The site imports `parse`, `check`, `diff`,
  `parseSchema` and the text/JSON report formatters straight from `../src`
  (Vite alias `@core`). Findings, messages, ordering and reports are identical
  to `dotenv-audit check` and `dotenv-audit diff`; a test compares them with the
  sample output in the root README.
- **No backend.** Audits run in a Web Worker bundled with the site and stop
  after 5 seconds, so a slow schema `pattern` cannot freeze the page.
- **Browser-safe imports only.** `scan` (git) and the CLI entry point are never
  imported. `node:fs/promises`, reached only through the CLI-only
  `loadSchemaFile`, is aliased to a stub that throws. `exitCode` is mirrored in
  `src/engine/audit.ts` because `src/cli.ts` touches `process`; a parity test
  guards it.

## Privacy

- Editor contents live in React state only: never in storage, cookies, the URL,
  the console or the network. Only the light/dark theme choice is stored.
- The CSP in `../netlify.toml` sets `connect-src 'none'`, forbids inline and
  third-party scripts, and blocks framing.
- Spellcheck, autocorrect and Grammarly/password-manager hooks are disabled on
  the editors, and **Hide values** blurs them for screen sharing.
- `src/privacy.test.tsx` fills every input with marker values, opens every view,
  copies every report, and fails if a marker reaches the results, clipboard,
  storage, console or a network API.

## Development

Requires Node.js 22+.

```sh
cd web
npm ci
npm run dev     # http://localhost:5173
npm run check   # typecheck, lint, tests, production build
```

## Deploying to Netlify

`../netlify.toml` configures everything: base directory `web`, build command
`npm run build`, publish directory `dist`, Node 22, SPA fallback and security
headers. Connect the repository in Netlify and keep the defaults. Builds are
skipped when neither `web/` nor `src/` changed.
