import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cli = 'dist/cli.js';

describe.runIf(existsSync(cli))('built cli', () => {
  it('runs --version as an executable', () => {
    const out = execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' });
    expect(out.trim()).toBe(__VERSION__);
  });
});
