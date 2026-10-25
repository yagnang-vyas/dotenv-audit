import { Eye, EyeOff, Play, RotateCcw } from 'lucide-react';
import { useEffect, useReducer, useState } from 'react';
import {
  cliCommand,
  FAIL_ON_LEVELS,
  runAudit,
  type AuditOutcome,
  type AuditRequest,
  type FailOn,
} from '../../engine/audit.ts';
import { AuditClient } from '../../engine/client.ts';
import { ResultsPanel } from '../results/ResultsPanel.tsx';
import { Button } from '../ui/Button.tsx';
import { CopyButton } from '../ui/CopyButton.tsx';
import { cn } from '../ui/cn.ts';
import { Editor } from './Editor.tsx';
import {
  INITIAL_STATE,
  reducer,
  sameRequest,
  toRequest,
  type FileSlot,
  type Mode,
  type PlaygroundState,
} from './state.ts';

interface Run {
  request: AuditRequest;
  outcome: AuditOutcome;
}

export function Playground() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [masked, setMasked] = useState(false);
  // The synthetic sample is audited synchronously on first render, so the page
  // opens with real results; every later run goes through the worker.
  const [run, setRun] = useState<Run>(() => {
    const request = toRequest(INITIAL_STATE);
    return { request, outcome: runAudit(request) };
  });
  const [running, setRunning] = useState(false);
  const [client] = useState(() => new AuditClient());

  useEffect(() => () => client.dispose(), [client]);

  const request = toRequest(state);
  const stale = !sameRequest(run.request, request);

  /** A newer run supersedes an unfinished one, whose promise then never settles. */
  const audit = async (next: AuditRequest) => {
    setRunning(true);
    const outcome = await client.run(next);
    setRun({ request: next, outcome });
    setRunning(false);
  };

  const runCurrent = () => void audit(request);
  const reset = () => {
    dispatch({ type: 'reset' });
    void audit(toRequest(INITIAL_STATE));
  };

  const editorProps = (slot: FileSlot) => ({
    file: state.files[slot],
    masked,
    onTextChange: (text: string) => dispatch({ type: 'set-text', slot, text }),
    onNameChange: (name: string) => dispatch({ type: 'set-name', slot, name }),
    onLoadSample: () => dispatch({ type: 'load-sample', slot }),
    onClear: () => dispatch({ type: 'clear', slot }),
    onSubmit: runCurrent,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <ModeSwitch mode={state.mode} onChange={(mode) => dispatch({ type: 'set-mode', mode })} />
        <label className="inline-flex items-center gap-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Fail on</span>
          <select
            value={state.failOn}
            onChange={(event) =>
              dispatch({ type: 'set-fail-on', failOn: event.target.value as FailOn })
            }
            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {FAIL_ON_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setMasked(!masked)}
            aria-pressed={masked}
            title="Blur editor contents, for example while screen sharing"
          >
            {masked ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {masked ? 'Show values' : 'Hide values'}
          </Button>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw aria-hidden />
            Reset
          </Button>
          <Button variant="primary" onClick={runCurrent} disabled={running}>
            <Play aria-hidden />
            Run audit
          </Button>
        </div>
      </div>

      <CommandPreview request={request} />

      {state.mode === 'check' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Editor
            title="Environment file"
            description={
              <>
                The file being audited, like <code className="font-mono">--env</code>.
              </>
            }
            placeholder={'DATABASE_URL=postgres://localhost:5432/app\nPORT=3000'}
            {...editorProps('env')}
          />
          <ReferenceEditor state={state} dispatch={dispatch} editorProps={editorProps} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Editor
            title="File A"
            description="For example staging. Values are compared in memory and never shown."
            placeholder="NODE_ENV=production"
            {...editorProps('a')}
          />
          <Editor
            title="File B"
            description="For example production."
            placeholder="NODE_ENV=production"
            {...editorProps('b')}
          />
        </div>
      )}

      <ResultsPanel outcome={run.outcome} running={running} stale={stale} onRun={runCurrent} />
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const options: readonly { id: Mode; label: string }[] = [
    { id: 'check', label: 'Check' },
    { id: 'diff', label: 'Compare' },
  ];
  return (
    <div
      role="group"
      aria-label="Audit type"
      className="inline-flex rounded-lg border border-zinc-300 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={mode === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            mode === option.id
              ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-50'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
          )}
        >
          {option.label}
          <span className="ml-1.5 font-mono text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {option.id}
          </span>
        </button>
      ))}
    </div>
  );
}

function CommandPreview({ request }: { request: AuditRequest }) {
  const command = cliCommand(request);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="flex-1 text-xs font-medium text-zinc-500 sm:flex-none dark:text-zinc-400">
        Equivalent CLI command
      </span>
      <code className="order-last w-full min-w-0 font-mono text-[13px] break-all sm:order-none sm:w-auto sm:flex-1 text-zinc-800 dark:text-zinc-200">
        {command}
      </code>
      <CopyButton
        text={command}
        variant="ghost"
        iconOnly
        ariaLabel="Copy the equivalent CLI command"
      />
    </div>
  );
}

type Reference = 'example' | 'schema';

interface ReferenceEditorProps {
  state: PlaygroundState;
  dispatch: (action: Parameters<typeof reducer>[1]) => void;
  editorProps: (slot: FileSlot) => Omit<Parameters<typeof Editor>[0], 'title' | 'placeholder'>;
}

/** The example file and schema share one panel, each with its own on/off switch. */
function ReferenceEditor({ state, dispatch, editorProps }: ReferenceEditorProps) {
  const [tab, setTab] = useState<Reference>('example');
  const enabled = tab === 'example' ? state.useExample : state.useSchema;
  const tabs: readonly { id: Reference; label: string; on: boolean }[] = [
    { id: 'example', label: 'Example file', on: state.useExample },
    { id: 'schema', label: 'Schema', on: state.useSchema },
  ];

  const tabList = (
    <div role="tablist" aria-label="Reference" className="flex gap-1">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`reference-tab-${item.id}`}
          aria-selected={tab === item.id}
          tabIndex={tab === item.id ? 0 : -1}
          onClick={() => setTab(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              const next = item.id === 'example' ? 'schema' : 'example';
              setTab(next);
              document.getElementById(`reference-tab-${next}`)?.focus();
            }
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
            tab === item.id
              ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              item.on ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600',
            )}
          />
          {item.label}
          <span className="sr-only">{item.on ? '(included)' : '(not included)'}</span>
        </button>
      ))}
    </div>
  );

  const toggle = (
    <label className="inline-flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) =>
          dispatch({ type: 'set-use', source: tab, value: event.target.checked })
        }
        className="size-4 accent-brand-700"
      />
      {tab === 'example' ? (
        <span>
          Check against this example file (<code className="font-mono">--example</code>). Every key
          in it is required.
        </span>
      ) : (
        <span>
          Validate with this schema (<code className="font-mono">--schema</code>): types,
          constraints, optional keys.
        </span>
      )}
    </label>
  );

  return (
    <div role="tabpanel" aria-labelledby={`reference-tab-${tab}`} className="min-w-0">
      <Editor
        key={tab}
        title="Reference"
        headerSlot={tabList}
        description={toggle}
        placeholder={tab === 'example' ? 'DATABASE_URL=\nPORT=3000' : '{\n  "variables": {}\n}'}
        disabled={!enabled}
        {...editorProps(tab)}
      />
    </div>
  );
}
