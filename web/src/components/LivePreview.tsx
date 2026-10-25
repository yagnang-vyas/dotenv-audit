import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { runAudit } from '../engine/audit.ts';
import { SAMPLES } from './playground/state.ts';
import { Link } from '../router.tsx';
import { SeverityIcon } from './ui/Severity.tsx';

/**
 * A real audit of the synthetic sample files, computed on page load by the
 * same engine the playground and CLI use.
 */
export function LivePreview() {
  const outcome = useMemo(
    () =>
      runAudit({
        mode: 'check',
        env: SAMPLES.env,
        example: null,
        schema: SAMPLES.schema,
        failOn: 'error',
      }),
    [],
  );
  if (outcome.status !== 'completed') return null;
  const { errors, warnings, notes } = outcome.summary;

  return (
    <figure className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </span>
        <code className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {outcome.command}
        </code>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70" aria-label="Sample findings">
        {outcome.findings.slice(0, 6).map((finding, index) => (
          <li key={index} className="flex items-start gap-3 px-4 py-2.5">
            <SeverityIcon severity={finding.severity} className="mt-0.5" />
            <span className="w-14 shrink-0 font-mono text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {finding.id}
            </span>
            <span className="min-w-0 text-sm leading-5">
              {finding.key !== null && (
                <span className="font-mono font-medium">{finding.key} </span>
              )}
              <span className="text-zinc-600 dark:text-zinc-400">{finding.message}</span>
            </span>
            <span className="sr-only">{finding.severity}</span>
          </li>
        ))}
      </ul>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <span>
          {plural(errors, 'error')}, {plural(warnings, 'warning')}, {plural(notes, 'note')} ·
          computed live in your browser from synthetic sample files
        </span>
        <Link
          to="/playground"
          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          Open in playground <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </figcaption>
    </figure>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
