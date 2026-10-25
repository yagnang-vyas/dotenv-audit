import { Eraser, FileText, Upload } from 'lucide-react';
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MAX_INPUT_BYTES, type InputFile } from '../../engine/audit.ts';
import { Button } from '../ui/Button.tsx';
import { cn } from '../ui/cn.ts';

interface EditorProps {
  /** Visible heading, for example "Environment file". */
  title: string;
  description?: ReactNode;
  file: InputFile;
  placeholder: string;
  masked: boolean;
  disabled?: boolean;
  onTextChange: (text: string) => void;
  onNameChange: (name: string) => void;
  onLoadSample: () => void;
  onClear: () => void;
  onSubmit: () => void;
  /** Extra controls rendered in the header, such as a tab list. */
  headerSlot?: ReactNode;
}

/**
 * A plain-text editor with line numbers. Input stays in React state only: it
 * is never written to storage, logged or sent anywhere. Browser and extension
 * features that could read or transmit the text (spellcheck, autocorrect,
 * Grammarly, password managers) are switched off.
 */
export function Editor({
  title,
  description,
  file,
  placeholder,
  masked,
  disabled = false,
  onTextChange,
  onNameChange,
  onLoadSample,
  onClear,
  onSubmit,
  headerSlot,
}: EditorProps) {
  const id = useId();
  const gutter = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lineCount = file.text === '' ? 1 : file.text.split('\n').length;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (selected === undefined) return;
    if (selected.size > MAX_INPUT_BYTES) {
      setUploadError(`File is larger than ${MAX_INPUT_BYTES / 1024} KiB; use the CLI instead.`);
      return;
    }
    setUploadError(null);
    // Read locally with the File API; the file never leaves the device.
    onTextChange(await selected.text());
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/40',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h3 id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </h3>
        {headerSlot}
        <div className="ml-auto flex items-center gap-0.5">
          <input
            ref={upload}
            type="file"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => void handleFile(event)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => upload.current?.click()}
            disabled={disabled}
            aria-label={`Open a local file into ${title}`}
            title="Open a local file (read in your browser, never uploaded)"
          >
            <Upload aria-hidden />
            <span className="hidden sm:inline">Open</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadSample}
            disabled={disabled}
            aria-label={`Load sample into ${title}`}
            title="Load the synthetic sample"
          >
            <FileText aria-hidden />
            <span className="hidden sm:inline">Sample</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled || file.text === ''}
            aria-label={`Clear ${title}`}
            title="Clear"
          >
            <Eraser aria-hidden />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>
      {description !== undefined && (
        <div className="border-b border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {description}
        </div>
      )}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/70 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <label htmlFor={`${id}-name`} className="text-xs text-zinc-500 dark:text-zinc-400">
          File name
        </label>
        <input
          id={`${id}-name`}
          value={file.name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          maxLength={64}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs text-zinc-800 hover:border-zinc-300 focus:border-zinc-300 dark:text-zinc-200 dark:hover:border-zinc-700 dark:focus:border-zinc-700"
        />
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400" aria-hidden>
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>
      </div>
      <div className="relative flex h-72 min-h-0 font-mono text-[13px] leading-6 sm:h-80">
        <div
          ref={gutter}
          aria-hidden
          className="w-10 shrink-0 overflow-hidden border-r border-zinc-200 bg-zinc-50/70 py-2 pr-2 text-right text-zinc-400 select-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-600"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <textarea
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-hint`}
          value={file.text}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            if (gutter.current !== null) gutter.current.scrollTop = event.currentTarget.scrollTop;
          }}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          data-lpignore="true"
          data-1p-ignore="true"
          className={cn(
            'min-w-0 flex-1 resize-none bg-transparent px-3 py-2 whitespace-pre text-zinc-900 outline-none placeholder:text-zinc-400 focus-visible:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-600',
            masked && 'editor-masked',
          )}
        />
      </div>
      <p
        id={`${id}-hint`}
        className="border-t border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
      >
        {uploadError ?? 'Stays in this tab. Press Ctrl/⌘ + Enter to run.'}
      </p>
    </section>
  );
}
