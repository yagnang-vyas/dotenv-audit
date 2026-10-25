import { CopyButton } from './CopyButton.tsx';
import { cn } from './cn.ts';

interface CodeBlockProps {
  code: string;
  /** Shown above the code, for example "Terminal". */
  label?: string;
  prompt?: boolean;
  className?: string;
}

export function CodeBlock({ code, label, prompt = false, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label ?? 'Terminal'}
        </span>
        <CopyButton text={code} variant="ghost" iconOnly ariaLabel={`Copy ${label ?? 'command'}`} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
        <code>
          {prompt
            ? code.split('\n').map((line, index) => (
                <span key={index} className="block">
                  <span className="text-zinc-400 select-none dark:text-zinc-600" aria-hidden>
                    ${' '}
                  </span>
                  {line}
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
