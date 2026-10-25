import { Download } from 'lucide-react';
import { useState } from 'react';
import type { CompletedAudit } from '../../engine/audit.ts';
import { Button } from '../ui/Button.tsx';
import { CopyButton } from '../ui/CopyButton.tsx';
import { cn } from '../ui/cn.ts';
import { downloadText } from './download.ts';

type Format = 'text' | 'json';

/** The exact report the CLI prints for this audit, from the CLI's own formatters. */
export function ReportView({ audit }: { audit: CompletedAudit }) {
  const [format, setFormat] = useState<Format>('text');
  const report = format === 'text' ? audit.textReport : audit.jsonReport;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <div
          role="group"
          aria-label="Report format"
          className="inline-flex rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700"
        >
          {(['text', 'json'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={format === option}
              onClick={() => setFormat(option)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium',
                format === option
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
              )}
            >
              {option === 'text' ? 'Text' : 'JSON'}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Same output as <code className="font-mono">--format {format}</code>. Contains file names,
          keys and line numbers, never values.
        </span>
        <div className="ml-auto flex gap-2">
          <CopyButton text={report} label="Copy report" />
          <Button
            size="sm"
            onClick={() =>
              downloadText(
                `dotenv-audit-${audit.mode}.${format === 'text' ? 'txt' : 'json'}`,
                report,
                format === 'text' ? 'text/plain' : 'application/json',
              )
            }
          >
            <Download aria-hidden />
            Download
          </Button>
        </div>
      </div>
      <pre
        aria-label={`${format === 'text' ? 'Text' : 'JSON'} report`}
        tabIndex={0}
        className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200"
      >
        {report}
      </pre>
    </div>
  );
}
