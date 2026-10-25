import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
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
export function scan(dir = '.'): Finding[] {
  assertDirectory(dir);
  git(dir, ['rev-parse', '--show-toplevel'], `not a git repository: ${dir}`);

  const tracked = git(dir, ['ls-files', '-z', '--', '.'], `git ls-files failed in ${dir}`)
    .split('\0')
    .filter((path) => path !== '' && isEnvFileName(basename(path)));
  const findings = tracked.map((path) =>
    finding('ENV007', join(dir, path), null, null, 'env file is tracked by git'),
  );

  const envPath = join(dir, '.env');
  const ignoredBy = gitignoreSource(dir);
  if (ignoredBy !== 'gitignore') {
    const message =
      ignoredBy === 'local'
        ? '.env is ignored only by a local or global exclude file, not by .gitignore'
        : '.env is not ignored by .gitignore';
    findings.push(finding('ENV008', envPath, null, null, message));
  }
  return sortFindings(findings);
}

function assertDirectory(dir: string): void {
  let isDirectory = false;
  try {
    isDirectory = statSync(dir).isDirectory();
  } catch {
    // Reported below.
  }
  if (!isDirectory) throw new UsageError(`not a directory: ${dir}`);
}

type IgnoreSource = 'gitignore' | 'local' | 'none';

/**
 * Asks git which rule decides whether `.env` is ignored. Only a non-negated
 * pattern from a `.gitignore` inside the repository counts, because
 * `.git/info/exclude` and global excludes are not shared with collaborators.
 */
function gitignoreSource(dir: string): IgnoreSource {
  const result = runGit(
    dir,
    ['check-ignore', '--verbose', '--no-index', '-z', '--stdin'],
    '.env\0',
  );
  if (result.status === 1) return 'none';
  if (result.status !== 0) throw new UsageError(`git check-ignore failed in ${dir}`);
  const [source = '', , pattern = ''] = result.stdout.split('\0');
  if (pattern.startsWith('!')) return 'none';
  return basename(source) === '.gitignore' && !isAbsolute(source) ? 'gitignore' : 'local';
}

function git(dir: string, args: readonly string[], failure: string): string {
  const result = runGit(dir, args);
  if (result.status !== 0) throw new UsageError(failure);
  return result.stdout;
}

interface GitResult {
  status: number | null;
  stdout: string;
}

function runGit(dir: string, args: readonly string[], input?: string): GitResult {
  try {
    const stdout = execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { status: 0, stdout };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new UsageError('git is not installed or not on PATH');
    }
    const status = error instanceof Error && 'status' in error ? error.status : null;
    const stdout = error instanceof Error && 'stdout' in error ? error.stdout : '';
    return {
      status: typeof status === 'number' ? status : null,
      stdout: typeof stdout === 'string' ? stdout : '',
    };
  }
}
