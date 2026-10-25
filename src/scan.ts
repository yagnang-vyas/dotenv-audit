import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { UsageError } from './errors.js';
import { finding, sortFindings } from './findings.js';
import type { Finding } from './types.js';

const ALLOWED_NAMES = new Set(['.env.example', '.env.sample', '.env.template']);

/** True for `.env` and `.env.*` file names, except the documented example names. */
export function isEnvFileName(name: string): boolean {
  return (name === '.env' || name.startsWith('.env.')) && !ALLOWED_NAMES.has(name);
}

/**
 * Finds env files tracked by git under `dir` (ENV007) and checks that
 * `.gitignore` rules ignore `<dir>/.env` (ENV008). Git runs via `execFile`
 * with an argument list, never through a shell.
 */
export async function scan(dir = '.'): Promise<Finding[]> {
  await assertDirectory(dir);
  await git(dir, ['rev-parse', '--show-toplevel'], `not a git repository: ${dir}`);

  const listing = await git(dir, ['ls-files', '-z', '--', '.'], `git ls-files failed in ${dir}`);
  const findings = listing
    .split('\0')
    .filter((path) => path !== '' && isEnvFileName(basename(path)))
    .map((path) => finding('ENV007', join(dir, path), null, null, 'env file is tracked by git'));

  const ignoredBy = await gitignoreSource(dir);
  if (ignoredBy !== 'gitignore') {
    const message =
      ignoredBy === 'local'
        ? '.env is ignored only by a local or global exclude file, not by .gitignore'
        : '.env is not ignored by .gitignore';
    findings.push(finding('ENV008', join(dir, '.env'), null, null, message));
  }
  return sortFindings(findings);
}

async function assertDirectory(dir: string): Promise<void> {
  const isDirectory = await stat(dir).then(
    (stats) => stats.isDirectory(),
    () => false,
  );
  if (!isDirectory) throw new UsageError(`not a directory: ${dir}`);
}

type IgnoreSource = 'gitignore' | 'local' | 'none';

/**
 * Asks git which rule decides whether `.env` is ignored. Only a non-negated
 * pattern from a `.gitignore` inside the repository counts, because
 * `.git/info/exclude` and global excludes are not shared with collaborators.
 */
async function gitignoreSource(dir: string): Promise<IgnoreSource> {
  const args = ['check-ignore', '--verbose', '--no-index', '-z', '--stdin'];
  const result = await runGit(dir, args, '.env\0');
  if (result.status === 1) return 'none';
  if (result.status !== 0) throw new UsageError(`git check-ignore failed in ${dir}`);
  const [source = '', , pattern = ''] = result.stdout.split('\0');
  if (pattern.startsWith('!')) return 'none';
  return basename(source) === '.gitignore' && !isAbsolute(source) ? 'gitignore' : 'local';
}

async function git(dir: string, args: readonly string[], failure: string): Promise<string> {
  const result = await runGit(dir, args);
  if (result.status !== 0) throw new UsageError(failure);
  return result.stdout;
}

interface GitResult {
  status: number | null;
  stdout: string;
}

function runGit(dir: string, args: readonly string[], input = ''): Promise<GitResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      ['-C', dir, ...args],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        if (error === null) {
          resolve({ status: 0, stdout });
        } else if (error.code === 'ENOENT') {
          reject(new UsageError('git is not installed or not on PATH'));
        } else {
          resolve({ status: typeof error.code === 'number' ? error.code : null, stdout });
        }
      },
    );
    // git may exit before reading stdin; the exit status is what matters.
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(input);
  });
}
