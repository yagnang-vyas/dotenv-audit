import { finding, problemFindings, sortFindings } from './findings.js';
import { parse } from './parse.js';
import { isPlaceholder, isSecretLookingKey } from './placeholders.js';
import { validateValue, type Schema, type VariableSpec } from './schema.js';
import type { Entry, Finding, SourceFile } from './types.js';

export interface CheckInput {
  env: SourceFile;
  example?: SourceFile;
  schema?: Schema;
}

interface Expectation {
  required: boolean;
  spec?: VariableSpec;
}

/**
 * Audits an env file against an example file and/or a schema (SPEC.md §3).
 * Values are only compared and validated in memory; findings never carry them.
 */
export function check(input: CheckInput): Finding[] {
  const env = parse(input.env.text);
  const findings = problemFindings(input.env.path, env.problems);

  let exampleKeys: string[] = [];
  if (input.example !== undefined) {
    const example = parse(input.example.text);
    findings.push(...problemFindings(input.example.path, example.problems));
    exampleKeys = example.entries.map((entry) => entry.key);
  }

  const expected = expectations(exampleKeys, input.schema);
  const entries = new Map(env.entries.map((entry) => [entry.key, entry]));
  // Keys whose line failed to parse are present, just broken: ENV006 covers them.
  const brokenKeys = new Set(env.problems.flatMap((problem) => problem.key ?? []));

  for (const [key, expectation] of expected) {
    const entry = entries.get(key);
    if (entry === undefined) {
      if (expectation.required && !brokenKeys.has(key)) {
        findings.push(finding('ENV001', input.env.path, null, key, 'required key is missing'));
      }
    } else {
      findings.push(...checkValue(input.env.path, entry, expectation));
    }
  }

  for (const entry of env.entries) {
    const spec = expected.get(entry.key)?.spec;
    if (isSecretLookingKey(entry.key, spec?.secret) && isPlaceholder(entry.value)) {
      findings.push(
        finding(
          'ENV009',
          input.env.path,
          entry.line,
          entry.key,
          'placeholder value for a secret-looking key',
        ),
      );
    }
    if (!expected.has(entry.key)) {
      findings.push(unknownKey(input, entry));
    }
  }

  return sortFindings(findings);
}

function expectations(
  exampleKeys: readonly string[],
  schema: Schema | undefined,
): Map<string, Expectation> {
  const expected = new Map<string, Expectation>();
  for (const key of exampleKeys) expected.set(key, { required: true });
  for (const [key, spec] of schema?.variables ?? []) {
    expected.set(key, { required: spec.required, spec });
  }
  return expected;
}

function checkValue(file: string, entry: Entry, expectation: Expectation): Finding[] {
  if (entry.value === '') {
    // An empty optional value counts as unset, so it is not type-checked.
    return expectation.required
      ? [finding('ENV003', file, entry.line, entry.key, 'required key has an empty value')]
      : [];
  }
  const problem =
    expectation.spec === undefined ? undefined : validateValue(expectation.spec, entry.value);
  return problem === undefined ? [] : [finding('ENV004', file, entry.line, entry.key, problem)];
}

function unknownKey(input: CheckInput, entry: Entry): Finding {
  const sources = [
    ...(input.example === undefined ? [] : ['the example file']),
    ...(input.schema === undefined ? [] : ['the schema']),
  ];
  const strict = input.schema !== undefined && !input.schema.allowUnknown;
  return finding(
    'ENV002',
    input.env.path,
    entry.line,
    entry.key,
    `key is not defined in ${sources.join(' or ')}`,
    strict ? 'error' : 'warning',
  );
}
