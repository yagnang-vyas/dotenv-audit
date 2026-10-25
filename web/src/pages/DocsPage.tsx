import type { ReactNode } from 'react';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import { SeverityBadge } from '../components/ui/Severity.tsx';
import { FINDINGS } from '../content/findings.ts';
import {
  AGENTS_URL,
  CLI_EXAMPLES,
  CLI_OPTIONS,
  EXIT_CODES,
  INSTALL_FROM_SOURCE,
  ISSUES_URL,
  LIMITATIONS,
  REPO_URL,
  SCHEMA_TYPES,
  SPEC_URL,
  USAGE,
} from '../content/project.ts';
import { SAMPLE_SCHEMA } from '../engine/samples.ts';
import { Link } from '../router.tsx';

const SECTIONS = [
  { id: 'what-it-checks', title: 'What it checks' },
  { id: 'interpreting-findings', title: 'Interpreting findings' },
  { id: 'cli-usage', title: 'CLI usage' },
  { id: 'schema', title: 'Schema reference' },
  { id: 'playground-vs-cli', title: 'Playground vs CLI' },
  { id: 'privacy', title: 'Privacy' },
  { id: 'limitations', title: 'Known limitations' },
  { id: 'contributing', title: 'Contributing' },
] as const;

export function DocsPage() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[13rem_1fr]">
      <nav aria-label="On this page" className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          On this page
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm lg:flex-col">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="min-w-0 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          A summary of the repository&apos;s README and{' '}
          <a href={SPEC_URL} className="underline underline-offset-2" rel="noopener noreferrer">
            SPEC.md
          </a>
          , which are the source of truth.
        </p>

        <Section id="what-it-checks" title="What it checks">
          <p>
            Each finding has a stable ID and a default severity. The severity of ENV002 rises to
            error when the schema sets <Code>&quot;allowUnknown&quot;: false</Code>.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Severity
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Meaning
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Command
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Playground
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {FINDINGS.map((info) => (
                  <tr key={info.id}>
                    <th scope="row" className="px-3 py-2 text-left font-mono text-xs font-semibold">
                      {info.id}
                    </th>
                    <td className="px-3 py-2">
                      <SeverityBadge severity={info.severity} />
                    </td>
                    <td className="px-3 py-2">{info.title}</td>
                    <td className="px-3 py-2 font-mono text-xs">{info.command}</td>
                    <td className="px-3 py-2 text-xs">{info.inBrowser ? 'Yes' : 'CLI only'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A key is secret-looking if the schema marks it <Code>&quot;secret&quot;: true</Code> or
            its name contains <Code>PASS</Code>, <Code>PASSWORD</Code>, <Code>SECRET</Code>,{' '}
            <Code>TOKEN</Code>, <Code>API_KEY</Code>/<Code>APIKEY</Code>, <Code>PRIVATE_KEY</Code>/
            <Code>PRIVATEKEY</Code> or <Code>CREDENTIAL</Code> (any case). Placeholders are{' '}
            <Code>changeme</Code>, <Code>change_me</Code>, <Code>todo</Code>,{' '}
            <Code>replace_me</Code>, <Code>secret</Code>, <Code>password</Code>, <Code>xxx</Code>{' '}
            (three or more), <Code>your_…_here</Code> and anything in angle brackets, ignoring case.
          </p>
        </Section>

        <Section id="interpreting-findings" title="Interpreting findings">
          <p>
            Each finding names a file, a line (or the whole file), a key and the expectation that
            failed, for example <Code>PORT: expected an integer between 1 and 65535</Code>. It never
            contains the value. Errors usually block a deploy, warnings deserve a look, and notes
            (ENV011, a value that differs between environments) are informational and never fail a
            run.
          </p>
          <div className="space-y-3">
            {FINDINGS.map((info) => (
              <details
                key={info.id}
                className="group rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                  <span className="font-mono text-xs text-zinc-500">{info.id}</span> {info.title}
                </summary>
                <div className="space-y-2 border-t border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                  <p>{info.explanation}</p>
                  <p>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">Fix: </span>
                    {info.remediation}
                  </p>
                </div>
              </details>
            ))}
          </div>
          <h3 className="pt-2 font-semibold text-zinc-900 dark:text-zinc-100">Exit codes</h3>
          <SimpleTable
            head={['Code', 'Meaning']}
            rows={EXIT_CODES.map((exit) => [<Code key="c">{exit.code}</Code>, exit.meaning])}
          />
          <p>
            <Code>--fail-on</Code> sets the lowest severity that makes the exit code 1:{' '}
            <Code>error</Code> (default), <Code>warning</Code> or <Code>never</Code>. There is no{' '}
            <Code>note</Code> level.
          </p>
        </Section>

        <Section id="cli-usage" title="CLI usage">
          <p>Install from a clone (the package is not on npm yet):</p>
          <CodeBlock code={INSTALL_FROM_SOURCE} prompt />
          <CodeBlock code={USAGE} label="Usage" />
          <SimpleTable
            head={['Option', 'Default', 'Meaning']}
            rows={CLI_OPTIONS.map((option) => [
              <Code key="f">{option.flag}</Code>,
              option.defaultValue === '' ? '' : <Code key="d">{option.defaultValue}</Code>,
              option.meaning,
            ])}
          />
          <p>
            <Code>check</Code> compares <Code>--env</Code> with <Code>--example</Code>, validates it
            against <Code>--schema</Code>, or both. With neither option it uses{' '}
            <Code>.env.example</Code>. Every key in the example file is required; the schema decides
            which keys are optional and what type each value must have. <Code>diff</Code> compares
            the keys of two files. <Code>scan</Code> lists env files tracked by git under a
            directory and checks that <Code>.gitignore</Code> ignores <Code>.env</Code>.
          </p>
          <ul className="space-y-4">
            {CLI_EXAMPLES.map((example) => (
              <li key={example.command}>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{example.title}</p>
                <p>{example.description}</p>
                <CodeBlock code={example.command} prompt className="mt-2" />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="schema" title="Schema reference">
          <p>
            Every variable takes <Code>type</Code> and optionally <Code>required</Code> (default{' '}
            <Code>true</Code>), <Code>secret</Code> (default <Code>false</Code>, marks the key for
            placeholder detection) and <Code>description</Code>. <Code>allowUnknown</Code> (default{' '}
            <Code>true</Code>) controls whether keys missing from the schema are warnings or errors.
          </p>
          <CodeBlock code={SAMPLE_SCHEMA.trimEnd()} label="env.schema.json" />
          <SimpleTable
            head={['Type', 'Accepts', 'Extra properties']}
            rows={SCHEMA_TYPES.map((type) => [
              <Code key="t">{type.type}</Code>,
              type.accepts,
              type.extra,
            ])}
          />
          <p>
            <Code>pattern</Code> is an unanchored JavaScript regular expression (add{' '}
            <Code>^…$</Code> yourself). The schema file is validated strictly: unknown properties,
            wrong types, <Code>min &gt; max</Code> and invalid regular expressions are usage errors
            that name the JSON path.
          </p>
        </Section>

        <Section id="playground-vs-cli" title="Playground vs CLI">
          <p>
            The playground imports the CLI&apos;s own parser, <Code>check</Code>, <Code>diff</Code>,
            schema validator and report formatters from the repository, so the findings, messages,
            ordering and reports are the same as the CLI&apos;s for the same input.
          </p>
          <SimpleTable
            head={['Capability', 'Playground', 'CLI']}
            rows={[
              ['check against an example file and/or schema', 'Yes', 'Yes'],
              ['diff two env files', 'Yes', 'Yes'],
              ['Text and JSON reports', 'Yes (copy or download)', 'Yes (--format)'],
              ['--fail-on and exit codes', 'Shows the exit code the CLI would return', 'Yes'],
              [
                'scan for env files tracked by git (ENV007, ENV008)',
                'No: needs git and a repository',
                'Yes',
              ],
              ['Reading files from disk, CI integration', 'Paste or open a local file', 'Yes'],
              ['Input size', 'Up to 256 KiB per file', 'No limit'],
            ]}
          />
          <p>
            Audits run in a Web Worker and stop after five seconds, so an expensive schema{' '}
            <Code>pattern</Code> cannot freeze the page. The CLI has no such limit.
          </p>
        </Section>

        <Section id="privacy" title="Privacy">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              The site is static. There is no backend, no analytics and no third-party script.
              Pasted configuration is processed in your browser and never transmitted.
            </li>
            <li>
              The Content-Security-Policy blocks network requests from the page (
              <Code>connect-src &apos;none&apos;</Code>), so even a bug could not send editor
              contents anywhere.
            </li>
            <li>
              Editor contents are never written to localStorage, sessionStorage, IndexedDB or
              cookies, and never logged. Only the light/dark theme choice is stored.
            </li>
            <li>
              Spellcheck, autocorrect and common writing and password-manager extensions are
              disabled on the editors. Use <strong>Hide values</strong> while screen sharing.
            </li>
            <li>
              Findings and reports contain file names, keys and line numbers, never values. The
              comparison view shows where a key appears and whether values match, not what they are.
            </li>
          </ul>
          <p>
            Even so, prefer synthetic or redacted configuration. Never paste production secrets into
            any website you have not audited.
          </p>
        </Section>

        <Section id="limitations" title="Known limitations">
          <ul className="list-disc space-y-1.5 pl-5">
            {LIMITATIONS.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </Section>

        <Section id="contributing" title="Contributing">
          <p>
            Issues and pull requests are welcome on{' '}
            <a href={REPO_URL} className="underline underline-offset-2" rel="noopener noreferrer">
              GitHub
            </a>
            . Read{' '}
            <a href={AGENTS_URL} className="underline underline-offset-2" rel="noopener noreferrer">
              AGENTS.md
            </a>{' '}
            first: never print values, zero runtime dependencies for the CLI, real functionality
            only, and Conventional Commits. Run <Code>npm run check</Code> at the repository root
            for the CLI and in <Code>web/</Code> for this site.
          </p>
          <p>
            Found a bug?{' '}
            <a href={ISSUES_URL} className="underline underline-offset-2" rel="noopener noreferrer">
              Open an issue
            </a>
            , using synthetic values only. Or{' '}
            <Link to="/playground" className="underline underline-offset-2">
              reproduce it in the playground
            </Link>{' '}
            and attach the copied report, which contains no values.
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 pt-10">
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
        <a href={`#${id}`} className="hover:underline">
          {title}
        </a>
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

function SimpleTable({
  head,
  rows,
}: {
  head: readonly string[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
