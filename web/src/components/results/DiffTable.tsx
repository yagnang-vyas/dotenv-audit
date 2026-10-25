import { useState } from 'react';
import type { CompletedAudit, DiffRow, DiffStatus } from '../../engine/audit.ts';
import { cn } from '../ui/cn.ts';

const STATUS: Readonly<Record<DiffStatus, { label: string; className: string; marker: string }>> = {
  identical: {
    label: 'Same value',
    marker: '=',
    className: 'text-zinc-600 bg-zinc-100 dark:text-zinc-300 dark:bg-zinc-800',
  },
  different: {
    label: 'Value differs',
    marker: '≠',
    className: 'text-sky-800 bg-sky-50 dark:text-sky-200 dark:bg-sky-400/10',
  },
  'only-a': {
    label: 'Only in A',
    marker: '−',
    className: 'text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-400/10',
  },
  'only-b': {
    label: 'Only in B',
    marker: '+',
    className: 'text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-400/10',
  },
};

/** A value-free comparison of two env files: key, where it appears, and its status. */
export function DiffTable({ audit }: { audit: CompletedAudit }) {
  const [changesOnly, setChangesOnly] = useState(false);
  if (audit.diff === undefined) return null;
  const { a, b, counts, rows } = audit.diff;
  const visible = changesOnly ? rows.filter((row) => row.status !== 'identical') : rows;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 px-4 py-2.5 text-xs dark:border-zinc-800">
        <span>
          <strong className="font-mono font-medium">A</strong> ={' '}
          <span className="font-mono">{a}</span>
        </span>
        <span>
          <strong className="font-mono font-medium">B</strong> ={' '}
          <span className="font-mono">{b}</span>
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {counts.onlyInA} only in A · {counts.onlyInB} only in B · {counts.different} different ·{' '}
          {counts.identical} identical
        </span>
        <label className="ml-auto inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={changesOnly}
            onChange={(event) => setChangesOnly(event.target.checked)}
            className="size-4 accent-brand-700"
          />
          Differences only
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {rows.length === 0
            ? 'Neither file defines any keys.'
            : 'Every key has the same value in both files.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Keys in {a} and {b}. Values are compared in memory and never shown.
            </caption>
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th scope="col" className="w-8 px-4 py-2 font-medium">
                  <span className="sr-only">Change</span>
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Key
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  A
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  B
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {visible.map((row) => (
                <DiffTableRow key={row.key} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DiffTableRow({ row }: { row: DiffRow }) {
  const status = STATUS[row.status];
  return (
    <tr
      className={cn(
        row.status === 'only-a' && 'bg-amber-50/40 dark:bg-amber-400/[0.03]',
        row.status === 'only-b' && 'bg-amber-50/40 dark:bg-amber-400/[0.03]',
      )}
    >
      <td className="px-4 py-2 text-center font-mono text-zinc-400" aria-hidden>
        {status.marker}
      </td>
      <th
        scope="row"
        className="px-2 py-2 text-left font-mono font-medium [overflow-wrap:anywhere]"
      >
        {row.key}
      </th>
      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {row.lineA === null ? <Absent /> : `line ${row.lineA}`}
      </td>
      <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {row.lineB === null ? <Absent /> : `line ${row.lineB}`}
      </td>
      <td className="px-4 py-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
            status.className,
          )}
        >
          {status.label}
        </span>
      </td>
    </tr>
  );
}

function Absent() {
  return (
    <span>
      <span aria-hidden>—</span>
      <span className="sr-only">not set</span>
    </span>
  );
}
