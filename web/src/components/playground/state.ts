import type { AuditRequest, FailOn, InputFile } from '../../engine/audit.ts';
import {
  SAMPLE_ENV,
  SAMPLE_EXAMPLE,
  SAMPLE_PRODUCTION,
  SAMPLE_SCHEMA,
  SAMPLE_STAGING,
} from '../../engine/samples.ts';

export type Mode = 'check' | 'diff';
export type FileSlot = 'env' | 'example' | 'schema' | 'a' | 'b';

export interface PlaygroundState {
  mode: Mode;
  files: Record<FileSlot, InputFile>;
  useExample: boolean;
  useSchema: boolean;
  failOn: FailOn;
}

export const SAMPLES: Readonly<Record<FileSlot, InputFile>> = {
  env: { name: '.env', text: SAMPLE_ENV },
  example: { name: '.env.example', text: SAMPLE_EXAMPLE },
  schema: { name: 'env.schema.json', text: SAMPLE_SCHEMA },
  a: { name: '.env.staging', text: SAMPLE_STAGING },
  b: { name: '.env.production', text: SAMPLE_PRODUCTION },
};

export const INITIAL_STATE: PlaygroundState = {
  mode: 'check',
  files: { ...SAMPLES },
  useExample: true,
  useSchema: false,
  failOn: 'error',
};

export type Action =
  | { type: 'set-mode'; mode: Mode }
  | { type: 'set-text'; slot: FileSlot; text: string }
  | { type: 'set-name'; slot: FileSlot; name: string }
  | { type: 'load-sample'; slot: FileSlot }
  | { type: 'clear'; slot: FileSlot }
  | { type: 'set-use'; source: 'example' | 'schema'; value: boolean }
  | { type: 'set-fail-on'; failOn: FailOn }
  | { type: 'reset' };

export function reducer(state: PlaygroundState, action: Action): PlaygroundState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'set-text':
      return withFile(state, action.slot, { text: action.text });
    case 'set-name':
      return withFile(state, action.slot, { name: action.name });
    case 'load-sample':
      return withFile(state, action.slot, SAMPLES[action.slot]);
    case 'clear':
      return withFile(state, action.slot, { text: '' });
    case 'set-use':
      return action.source === 'example'
        ? { ...state, useExample: action.value }
        : { ...state, useSchema: action.value };
    case 'set-fail-on':
      return { ...state, failOn: action.failOn };
    case 'reset':
      return INITIAL_STATE;
  }
}

function withFile(
  state: PlaygroundState,
  slot: FileSlot,
  patch: Partial<InputFile>,
): PlaygroundState {
  return { ...state, files: { ...state.files, [slot]: { ...state.files[slot], ...patch } } };
}

/** The audit the current state describes. */
export function toRequest(state: PlaygroundState): AuditRequest {
  const { files, failOn } = state;
  if (state.mode === 'diff') return { mode: 'diff', a: files.a, b: files.b, failOn };
  return {
    mode: 'check',
    env: files.env,
    example: state.useExample ? files.example : null,
    schema: state.useSchema ? files.schema : null,
    failOn,
  };
}

/** True when two requests would produce the same audit. */
export function sameRequest(a: AuditRequest, b: AuditRequest): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
