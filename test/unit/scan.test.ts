import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { UsageError } from '../../src/errors.js';
import { isEnvFileName, scan } from '../../src/scan.js';
import type { Finding } from '../../src/types.js';
import { git, isolateGit, tempRepo } from '../git.js';

const summary = (findings: Finding[], root: string): string[] =>
  findings.map((f) => `${f.id} ${f.severity} ${f.file.replace(root, '<repo>')}: ${f.message}`);

beforeAll(isolateGit);

describe('isEnvFileName', () => {
  it.each(['.env', '.env.local', '.env.production', '.env.local.example', '.env.'])(
    'matches %s',
    (name) => {
      expect(isEnvFileName(name)).toBe(true);
    },
  );

  it.each([
    '.env.example',
    '.env.sample',
    '.env.template',
    'env',
    '.envrc',
    'app.env',
    '.environment',
  ])('ignores %s', (name) => {
    expect(isEnvFileName(name)).toBe(false);
  });
});

describe('scan', () => {
  it('is clean when .gitignore covers .env and only examples are tracked', () => {
    const repo = tempRepo({
      '.gitignore': '.env\n.env.*\n!.env.example\n',
      '.env.example': 'A=\n',
      '.env': 'A=1\n',
    });
    git(repo, 'add', '.');
    expect(scan(repo)).toEqual([]);
  });

  it('reports tracked env files at any depth (ENV007)', () => {
    const repo = tempRepo({
      '.gitignore': '.env\n',
      '.env.production': 'A=fake\n',
      'apps/web/.env': 'A=fake\n',
      'apps/web/.env.sample': 'A=\n',
      'README.md': '# hi\n',
    });
    git(repo, 'add', '-f', '.');
    expect(summary(scan(repo), repo)).toEqual([
      'ENV007 error <repo>/.env.production: env file is tracked by git',
      'ENV007 error <repo>/apps/web/.env: env file is tracked by git',
    ]);
  });

  it('reports committed files and handles unusual names', () => {
    const repo = tempRepo({ '.gitignore': '.env\n', 'odd dir/.env.with space': 'A=fake\n' });
    git(repo, 'add', '-f', '.');
    git(repo, 'commit', '-qm', 'test');
    expect(summary(scan(repo), repo)).toEqual([
      'ENV007 error <repo>/odd dir/.env.with space: env file is tracked by git',
    ]);
  });

  it('reports a missing .gitignore rule (ENV008)', () => {
    const repo = tempRepo({ 'README.md': '# hi\n' });
    expect(summary(scan(repo), repo)).toEqual([
      'ENV008 warning <repo>/.env: .env is not ignored by .gitignore',
    ]);
  });

  it('treats a negated rule as not ignored', () => {
    const repo = tempRepo({ '.gitignore': '.env\n!.env\n' });
    expect(summary(scan(repo), repo)).toEqual([
      'ENV008 warning <repo>/.env: .env is not ignored by .gitignore',
    ]);
  });

  it('does not accept .git/info/exclude as shared protection', () => {
    const repo = tempRepo();
    writeFileSync(join(repo, '.git', 'info', 'exclude'), '.env\n');
    expect(summary(scan(repo), repo)).toEqual([
      'ENV008 warning <repo>/.env: .env is ignored only by a local or global exclude file, not by .gitignore',
    ]);
  });

  it('scans only the given subdirectory and honours nested .gitignore files', () => {
    const repo = tempRepo({
      'other/.env': 'A=fake\n',
      'app/.gitignore': '.env\n',
      'app/.env.local': 'A=fake\n',
    });
    git(repo, 'add', '-f', '.');
    expect(summary(scan(join(repo, 'app')), repo)).toEqual([
      'ENV007 error <repo>/app/.env.local: env file is tracked by git',
    ]);
  });

  it('uses relative paths as given', () => {
    const repo = tempRepo({ '.env': 'A=fake\n' });
    git(repo, 'add', '-f', '.');
    const cwd = process.cwd();
    process.chdir(repo);
    try {
      expect(scan().map((f) => f.file)).toEqual(['.env', '.env']);
    } finally {
      process.chdir(cwd);
    }
  });

  it('rejects directories outside a git repository', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dotenv-audit-norepo-'));
    expect(() => scan(dir)).toThrow(new UsageError(`not a git repository: ${dir}`));
  });

  it('rejects paths that are not directories', () => {
    const repo = tempRepo({ 'file.txt': 'x' });
    expect(() => scan(join(repo, 'file.txt'))).toThrow(
      `not a directory: ${join(repo, 'file.txt')}`,
    );
    expect(() => scan(join(repo, 'missing'))).toThrow(`not a directory: ${join(repo, 'missing')}`);
  });

  it('reports a missing git binary as a usage error', () => {
    const repo = tempRepo();
    const path = process.env.PATH;
    process.env.PATH = '';
    try {
      expect(() => scan(repo)).toThrow('git is not installed or not on PATH');
    } finally {
      process.env.PATH = path;
    }
  });
});
