import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatText } from '@core/report/text.ts';
import { FINDINGS_BY_ID } from '../../content/findings.ts';
import type { CompletedAudit, Finding, Severity } from '../../engine/audit.ts';
import { CopyButton } from '../ui/CopyButton.tsx';
import { SeverityBadge, SeverityIcon } from '../ui/Severity.tsx';
import { cn } from '../ui/cn.ts';

export type SeverityFilter = Severity | 'all';

/** One finding as the CLI prints it, without a summary line. */
export function findingLines(audit: CompletedAudit, findings: readonly Finding[]): string {
  return formatText({ command: audit.mode, findings }, { quiet: true });
}

function location(finding: Finding): string {
  return finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
}

interface FindingListProps {
  audit: CompletedAudit;
  filter: SeverityFilter;
}

export function FindingList({ audit, filter }: FindingListProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return audit.findings.filter(
      (finding) =>
        (filter === 'all' || finding.severity === filter) &&
        (needle === '' ||
          finding.id.toLowerCase().includes(needle) ||
          (finding.key?.toLowerCase().includes(needle) ?? false) ||
          finding.message.toLowerCase().includes(needle)),
    );
  }, [audit.findings, filter, query]);

  if (audit.findings.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        The audit completed and reported no findings.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by key, ID or message"
            aria-label="Filter findings by key, ID or message"
            spellCheck={false}
            autoComplete="off"
            className="h-8 w-full rounded-md border border-zinc-300 bg-white pr-2 pl-8 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Showing {visible.length} of {audit.findings.length}
        </span>
        <div className="ml-auto">
          <CopyButton
            text={findingLines(audit, visible)}
            label="Copy shown findings"
            ariaLabel="Copy the shown findings as text"
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No findings match the current filters.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-label="Findings">
          {visible.map((finding, index) => (
            <FindingItem
              key={`${finding.file}:${finding.line}:${finding.id}:${finding.key}:${index}`}
              audit={audit}
              finding={finding}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FindingItem({ audit, finding }: { audit: CompletedAudit; finding: Finding }) {
  const info = FINDINGS_BY_ID.get(finding.id);
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 [&::-webkit-details-marker]:hidden">
          <ChevronRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
          />
          <SeverityIcon severity={finding.severity} className="mt-0.5" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {finding.id}
              </span>
              {finding.key !== null && (
                <span className="font-mono text-sm font-medium break-all">{finding.key}</span>
              )}
              <span className="sr-only">{finding.severity}</span>
            </span>
            <span className="mt-0.5 block text-sm text-zinc-700 dark:text-zinc-300">
              {finding.message}
            </span>
          </span>
          <span className="hidden shrink-0 font-mono text-xs text-zinc-500 sm:block dark:text-zinc-400">
            {location(finding)}
          </span>
        </summary>
        <div className="space-y-3 border-t border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 pl-14 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            {info !== undefined && <span className="font-medium">{info.title}</span>}
            <span className="font-mono text-xs text-zinc-500 sm:hidden dark:text-zinc-400">
              {location(finding)}
            </span>
          </div>
          {info !== undefined && (
            <dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
              <dt className="text-zinc-500 dark:text-zinc-400">What it means</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{info.explanation}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">How to fix</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{info.remediation}</dd>
            </dl>
          )}
          <div className={cn('flex gap-2')}>
            <CopyButton
              text={findingLines(audit, [finding])}
              label="Copy finding"
              ariaLabel={`Copy finding ${finding.id}${finding.key === null ? '' : ` for ${finding.key}`}`}
            />
          </div>
        </div>
      </details>
    </li>
  );
}
