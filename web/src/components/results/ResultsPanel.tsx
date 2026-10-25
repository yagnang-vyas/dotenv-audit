import {
  CircleCheck,
  CircleX,
  LoaderCircle,
  OctagonAlert,
  Play,
  TriangleAlert,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { AuditOutcome, CompletedAudit } from '../../engine/audit.ts';
import { SEVERITY_LABEL, SeverityIcon } from '../ui/Severity.tsx';
import { cn } from '../ui/cn.ts';
import { DiffTable } from './DiffTable.tsx';
import { FindingList, type SeverityFilter } from './FindingList.tsx';
import { KeyGroups } from './KeyGroups.tsx';
import { ReportView } from './ReportView.tsx';

interface ResultsPanelProps {
  outcome: AuditOutcome | null;
  running: boolean;
  /** Inputs changed since `outcome` was produced. */
  stale: boolean;
  onRun: () => void;
}

export function ResultsPanel({ outcome, running, stale, onRun }: ResultsPanelProps) {
  return (
    <section
      aria-labelledby="results-title"
      aria-busy={running}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2 id="results-title" className="sr-only">
        Audit results
      </h2>
      <div aria-live="polite">
        <Body outcome={outcome} running={running} stale={stale} onRun={onRun} />
      </div>
    </section>
  );
}

function Body({ outcome, running, stale, onRun }: ResultsPanelProps) {
  if (running && outcome === null) return <Running />;
  if (outcome === null) {
    return (
      <EmptyState
        icon={<Play aria-hidden className="size-5" />}
        title="No audit yet"
        body="Run the audit to see findings. Nothing is checked until you do."
      />
    );
  }
  return (
    <>
      {(stale || running) && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          {running ? (
            <>
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Running audit…
            </>
          ) : (
            <>
              <TriangleAlert aria-hidden className="size-4" />
              The inputs changed after this audit ran. These results are out of date.
              <button
                type="button"
                onClick={onRun}
                className="ml-auto font-medium underline underline-offset-2"
              >
                Run again
              </button>
            </>
          )}
        </div>
      )}
      {outcome.status === 'usage-error' ? (
        <UsageErrorState message={outcome.message} />
      ) : (
        <Completed audit={outcome} />
      )}
    </>
  );
}

function Running() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-zinc-600 dark:text-zinc-400">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      Running audit…
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </div>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

function UsageErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-3 px-4 py-6">
      <OctagonAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
      <div>
        <p className="font-medium">The audit could not run</p>
        <p className="mt-1 font-mono text-sm break-words text-zinc-700 dark:text-zinc-300">
          dotenv-audit: error: {message}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          No checks were completed, so there are no results to show. The CLI exits with code 2 in
          this case.
        </p>
      </div>
    </div>
  );
}

type Tab = 'findings' | 'keys' | 'report';

function Completed({ audit }: { audit: CompletedAudit }) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [tab, setTab] = useState<Tab>('findings');
  const tabs: readonly { id: Tab; label: string }[] = [
    { id: 'findings', label: `Findings (${audit.findings.length})` },
    { id: 'keys', label: audit.mode === 'diff' ? 'Comparison' : 'Keys' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div>
      <Outcome audit={audit} />
      <div className="grid grid-cols-2 gap-px border-y border-zinc-200 bg-zinc-200 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
        <StatTile
          label="Total findings"
          value={audit.findings.length}
          active={filter === 'all'}
          onClick={() => {
            setFilter('all');
            setTab('findings');
          }}
        />
        {(['error', 'warning', 'note'] as const).map((severity) => (
          <StatTile
            key={severity}
            label={`${SEVERITY_LABEL[severity]}s`}
            value={
              audit.summary[
                severity === 'error' ? 'errors' : severity === 'warning' ? 'warnings' : 'notes'
              ]
            }
            icon={<SeverityIcon severity={severity} />}
            active={filter === severity}
            onClick={() => {
              setFilter(filter === severity ? 'all' : severity);
              setTab('findings');
            }}
          />
        ))}
      </div>
      <div
        role="tablist"
        aria-label="Result views"
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 px-3 dark:border-zinc-800"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          const index = tabs.findIndex((item) => item.id === tab);
          const next =
            tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          if (next === undefined) return;
          setTab(next.id);
          document.getElementById(`results-tab-${next.id}`)?.focus();
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`results-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`results-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-2.5 py-2.5 text-sm font-medium whitespace-nowrap',
              tab === item.id
                ? 'border-brand-600 text-zinc-900 dark:border-brand-400 dark:text-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`results-panel-${tab}`} aria-labelledby={`results-tab-${tab}`}>
        {tab === 'findings' && <FindingList audit={audit} filter={filter} />}
        {tab === 'keys' &&
          (audit.mode === 'diff' ? <DiffTable audit={audit} /> : <KeyGroups audit={audit} />)}
        {tab === 'report' && <ReportView audit={audit} />}
      </div>
    </div>
  );
}

function Outcome({ audit }: { audit: CompletedAudit }) {
  const { errors, warnings, notes } = audit.summary;
  const failed = audit.exitCode === 1;
  const clean = audit.findings.length === 0;
  const keys = audit.files.reduce((total, file) => total + file.keys, 0);
  const title = clean
    ? 'Audit passed with no findings'
    : failed
      ? 'Audit failed'
      : 'Audit passed with findings below the failure threshold';
  const Icon = failed ? CircleX : CircleCheck;

  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-4">
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-6 shrink-0',
          failed ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {clean
            ? `Checked ${keys} ${keys === 1 ? 'key' : 'keys'} across ${audit.files.map((file) => file.name).join(' and ')}.`
            : `${errors} ${errors === 1 ? 'error' : 'errors'}, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}, ${notes} ${notes === 1 ? 'note' : 'notes'}.`}{' '}
          The CLI would exit with code{' '}
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
            {audit.exitCode}
          </span>{' '}
          (<code className="font-mono">--fail-on {audit.failOn}</code>).
        </p>
      </div>
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: number;
  icon?: ReactNode;
  active: boolean;
  onClick: () => void;
}

function StatTile({ label, value, icon, active, onClick }: StatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-1 bg-white px-4 py-3 text-left hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900',
        active && 'bg-zinc-50 shadow-[inset_0_-2px_0_var(--color-brand-600)] dark:bg-zinc-900',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </button>
  );
}
