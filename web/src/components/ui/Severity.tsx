import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { Severity } from '../../engine/audit.ts';
import { cn } from './cn.ts';

export const SEVERITY_LABEL: Readonly<Record<Severity, string>> = {
  error: 'Error',
  warning: 'Warning',
  note: 'Note',
};

const STYLES: Readonly<Record<Severity, string>> = {
  error:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30',
  warning:
    'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/30',
  note: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/30',
};

export const SEVERITY_TEXT: Readonly<Record<Severity, string>> = {
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  note: 'text-sky-600 dark:text-sky-400',
};

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severity === 'error' ? CircleAlert : severity === 'warning' ? TriangleAlert : Info;
  return <Icon aria-hidden className={cn('size-4 shrink-0', SEVERITY_TEXT[severity], className)} />;
}

/** Severity shown with an icon and a word, never by colour alone. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[severity],
      )}
    >
      <SeverityIcon severity={severity} className="size-3.5 text-current dark:text-current" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
