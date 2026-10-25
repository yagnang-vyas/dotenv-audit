import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Isolates spawned git from the developer's global and system config. */
export function isolateGit(): void {
  process.env.GIT_CONFIG_GLOBAL = join(tmpdir(), 'dotenv-audit-no-global-gitconfig');
  process.env.GIT_CONFIG_NOSYSTEM = '1';
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Creates a temporary git repository containing `files` (path -> content). */
export function tempRepo(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'dotenv-audit-repo-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.name', 'dotenv-audit tests');
  git(dir, 'config', 'user.email', 'tests@example.test');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}
