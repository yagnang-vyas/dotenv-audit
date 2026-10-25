import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { git, isolateGit, tempRepo } from '../git.js';

/**
 * Every `$ dotenv-audit …` command in a README console block is re-run and its
 * output compared, so the documented output is always real.
 */
const cli = resolve('dist/cli.js');

interface Example {
  args: string[];
  expected: string;
}

function readmeExamples(): Example[] {
  const readme = readFileSync('README.md', 'utf8');
  const blocks = [...readme.matchAll(/```console\n([\s\S]*?)```/g)].map((match) => match[1] ?? '');
  const examples: Example[] = [];
  for (const block of blocks) {
    for (const part of block.split(/^(?=\$ )/m)) {
      const [command = '', ...output] = part.split('\n');
      if (!command.startsWith('$ dotenv-audit ')) continue;
      examples.push({
        args: command.slice('$ dotenv-audit '.length).split(' '),
        expected: output.join('\n'),
      });
    }
  }
  return examples;
}

function scanDemoRepo(): string {
  const repo = tempRepo({
    '.gitignore': 'node_modules/\n',
    '.env.example': 'A=\n',
    '.env.production': 'A=1\n',
    'apps/api/.env': 'A=1\n',
  });
  git(repo, 'add', '.');
  return repo;
}

beforeAll(isolateGit);

describe('README sample output', () => {
  const examples = readmeExamples();

  it('finds the documented examples', () => {
    expect(examples.length).toBeGreaterThanOrEqual(6);
  });

  it.each(examples.map((example) => [example.args.join(' '), example] as const))(
    'dotenv-audit %s',
    (_name, { args, expected }) => {
      const cwd = args[0] === 'scan' ? scanDemoRepo() : resolve('examples');
      const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
      expect(result.stdout + result.stderr).toBe(expected);
    },
  );
});
