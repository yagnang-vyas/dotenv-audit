import {
  ArrowRight,
  EyeOff,
  FileCheck2,
  GitCompareArrows,
  GitBranch,
  KeyRound,
  ListChecks,
  Terminal,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { GitHubIcon } from '../components/GitHubIcon.tsx';
import { LivePreview } from '../components/LivePreview.tsx';
import { buttonClasses } from '../components/ui/Button.tsx';
import { CodeBlock } from '../components/ui/CodeBlock.tsx';
import {
  CLI_EXAMPLES,
  COPYRIGHT,
  INSTALL_FROM_SOURCE,
  LICENSE_NAME,
  LICENSE_URL,
  REPO_URL,
} from '../content/project.ts';
import { Link } from '../router.tsx';

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
  where: 'Browser and CLI' | 'CLI only';
}

/** Features as listed in the repository README. */
const FEATURES: readonly Feature[] = [
  {
    icon: <ListChecks aria-hidden />,
    title: 'Check against an example file',
    body: 'Finds missing, empty, unknown and duplicate keys by comparing .env with .env.example.',
    where: 'Browser and CLI',
  },
  {
    icon: <FileCheck2 aria-hidden />,
    title: 'Typed schema validation',
    body: 'string, integer, number, boolean, port, url, email, enum and json types with constraints such as min, max, pattern and protocols.',
    where: 'Browser and CLI',
  },
  {
    icon: <KeyRound aria-hidden />,
    title: 'Placeholder secrets',
    body: 'Flags secret-looking keys that still hold values like changeme or <your-token>.',
    where: 'Browser and CLI',
  },
  {
    icon: <GitCompareArrows aria-hidden />,
    title: 'Value-free diff',
    body: 'Compares two environments: keys only in one file, keys whose values differ, and how many are identical.',
    where: 'Browser and CLI',
  },
  {
    icon: <GitBranch aria-hidden />,
    title: 'Committed env file scan',
    body: 'Lists env files tracked by git and checks that .gitignore covers .env.',
    where: 'CLI only',
  },
  {
    icon: <Terminal aria-hidden />,
    title: 'Built for CI',
    body: 'Deterministic text and JSON reports, --fail-on thresholds and meaningful exit codes. Zero runtime dependencies.',
    where: 'CLI only',
  },
];

export function HomePage() {
  return (
    <>
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <EyeOff aria-hidden className="size-3.5" />
              Never prints a value
            </p>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Audit your <code className="font-mono">.env</code> files before they break a deploy.
            </h1>
            <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
              dotenv-audit checks env files against an example file or a typed schema, compares
              environments without revealing values, and catches env files committed to git. Reports
              name files, keys and line numbers, never the values.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/playground" className={buttonClasses('primary')}>
                Try the playground
                <ArrowRight aria-hidden />
              </Link>
              <a href={REPO_URL} className={buttonClasses('secondary')} rel="noopener noreferrer">
                <GitHubIcon />
                View on GitHub
              </a>
            </div>
          </div>
          <LivePreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold tracking-tight">The problem</h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Deployments fail because <code className="font-mono">.env</code> lacks a key that{' '}
            <code className="font-mono">.env.example</code> has, a value has the wrong type (
            <code className="font-mono">PORT=three-thousand</code>), a placeholder (
            <code className="font-mono">changeme</code>) shipped to production, or staging and
            production quietly drifted apart. Teams also commit{' '}
            <code className="font-mono">.env</code> files by accident. dotenv-audit checks all of
            that from the outside, in CI or before a deploy.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-400/10 dark:text-brand-300 [&_svg]:size-[18px]">
                  {feature.icon}
                </span>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {feature.where}
                </span>
              </div>
              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Install the CLI</h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              dotenv-audit is not published to npm yet. Install it from a clone. It needs Node.js 22
              or newer and has no runtime dependencies.
            </p>
            <CodeBlock code={INSTALL_FROM_SOURCE} prompt className="mt-4" />
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              The playground runs the same audit engine as the CLI, compiled for the browser, so its
              findings match <code className="font-mono">check</code> and{' '}
              <code className="font-mono">diff</code> exactly. Use the CLI for{' '}
              <code className="font-mono">scan</code>, real files on disk and CI exit codes.{' '}
              <Link
                to="/docs#playground-vs-cli"
                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                What runs where
              </Link>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Examples</h2>
            <ul className="mt-4 space-y-4">
              {CLI_EXAMPLES.slice(0, 4).map((example) => (
                <li key={example.command}>
                  <p className="text-sm font-medium">{example.title}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{example.description}</p>
                  <CodeBlock code={example.command} prompt className="mt-2" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <h2 className="font-semibold">Open source, {LICENSE_NAME} licensed</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {COPYRIGHT}. Issues and pull requests are welcome.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={LICENSE_URL} className={buttonClasses('secondary')} rel="noopener noreferrer">
              Read the license
            </a>
            <Link to="/docs" className={buttonClasses('secondary')}>
              Documentation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
