import type { CliIo } from '../src/cli.js';

export interface Captured {
  io: CliIo;
  out: () => string;
  err: () => string;
}

export function captureIo(): Captured {
  let out = '';
  let err = '';
  return {
    io: {
      stdout: (text) => {
        out += text;
      },
      stderr: (text) => {
        err += text;
      },
    },
    out: () => out,
    err: () => err,
  };
}
