import type { CompletedAudit, FindingId } from '../../engine/audit.ts';
import { FINDINGS_BY_ID } from '../../content/findings.ts';

const GROUPS: readonly { id: FindingId; label: string }[] = [
  { id: 'ENV001', label: 'Missing' },
  { id: 'ENV002', label: 'Unexpected' },
  { id: 'ENV003', label: 'Empty' },
  { id: 'ENV004', label: 'Invalid value' },
  { id: 'ENV009', label: 'Placeholder secret' },
  { id: 'ENV005', label: 'Duplicated' },
];

/** Keys grouped by what is wrong with them, built from the check findings. */
export function KeyGroups({ audit }: { audit: CompletedAudit }) {
  const env = audit.files[0] ?? { name: '', keys: 0 };
  const groups = GROUPS.map((group) => ({
    ...group,
    keys: [
      ...new Set(
        audit.findings
          .filter((finding) => finding.id === group.id && finding.file === env.name)
          .flatMap((finding) => finding.key ?? []),
      ),
    ],
  }));

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {env.keys} {env.keys === 1 ? 'key' : 'keys'} parsed from{' '}
        <span className="font-mono">{env.name}</span>. Keys are listed by name only.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.id}
            aria-label={`${group.label} keys`}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <h4 className="flex items-baseline justify-between gap-2 text-sm font-medium">
              <span>
                {group.label}{' '}
                <span className="font-mono text-xs font-normal text-zinc-500">{group.id}</span>
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">{group.keys.length}</span>
            </h4>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {FINDINGS_BY_ID.get(group.id)?.title}
            </p>
            {group.keys.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">None</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {group.keys.map((key) => (
                  <li
                    key={key}
                    className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs break-all dark:border-zinc-700 dark:bg-zinc-800/60"
                  >
                    {key}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
