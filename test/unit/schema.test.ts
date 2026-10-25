import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UsageError } from '../../src/errors.js';
import { loadSchemaFile, parseSchema, validateValue, type VariableSpec } from '../../src/schema.js';

function schemaWith(variables: unknown, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ variables, ...extra });
}

function spec(definition: Record<string, unknown>): VariableSpec {
  const schema = parseSchema(schemaWith({ X: definition }), 'test');
  const result = schema.variables.get('X');
  if (result === undefined) throw new Error('variable missing');
  return result;
}

describe('parseSchema: valid schemas', () => {
  it('parses the documented example', () => {
    const schema = parseSchema(
      JSON.stringify({
        $schema: './whatever.json',
        variables: {
          DATABASE_URL: { type: 'url', protocols: ['postgres', 'PostgreSQL'] },
          PORT: { type: 'port', required: false },
          NODE_ENV: { type: 'enum', values: ['development', 'test', 'production'] },
          DEBUG: { type: 'boolean', required: false, description: 'Verbose logs' },
          API_KEY: { type: 'string', secret: true, minLength: 20, pattern: '^sk_' },
          WORKERS: { type: 'integer', min: 1, max: 64 },
          ADMIN_EMAIL: { type: 'email' },
          RATIO: { type: 'number', min: 0.5 },
          CONFIG: { type: 'json' },
        },
        allowUnknown: false,
      }),
      'env.schema.json',
    );
    expect(schema.allowUnknown).toBe(false);
    expect([...schema.variables.keys()]).toHaveLength(9);
    expect(schema.variables.get('DATABASE_URL')?.protocols).toEqual(['postgres', 'postgresql']);
    expect(schema.variables.get('PORT')).toEqual({ type: 'port', required: false, secret: false });
    expect(schema.variables.get('API_KEY')).toMatchObject({
      secret: true,
      required: true,
      minLength: 20,
    });
    expect(schema.variables.get('API_KEY')?.pattern?.source).toBe('^sk_');
  });

  it('defaults allowUnknown to true', () => {
    expect(parseSchema(schemaWith({}), 'x').allowUnknown).toBe(true);
  });
});

describe('parseSchema: errors carry a JSON path', () => {
  const cases: [name: string, json: string, message: string][] = [
    ['invalid JSON', '{ "variables": ', 'invalid JSON'],
    ['non-object root', '[]', '$: expected an object'],
    ['missing variables', '{}', '$: missing required property "variables"'],
    ['unknown top-level property', schemaWith({}, { strict: true }), '$.strict: unknown property'],
    ['non-object variables', '{"variables": []}', '$.variables: expected an object'],
    [
      'allowUnknown not boolean',
      schemaWith({}, { allowUnknown: 'no' }),
      '$.allowUnknown: expected a boolean',
    ],
    ['$schema not string', schemaWith({}, { $schema: 1 }), '$.$schema: expected a string'],
    [
      'bad variable name',
      schemaWith({ '1BAD': { type: 'string' } }),
      '$.variables.1BAD: variable names must match',
    ],
    ['variable not object', schemaWith({ A: 'string' }), '$.variables.A: expected an object'],
    ['missing type', schemaWith({ A: {} }), '$.variables.A.type: expected one of: string, integer'],
    ['unknown type', schemaWith({ A: { type: 'date' } }), '$.variables.A.type: expected one of'],
    [
      'unknown property',
      schemaWith({ A: { type: 'string', min: 1 } }),
      '$.variables.A.min: unknown property for type "string"',
    ],
    [
      'protocols on integer',
      schemaWith({ A: { type: 'integer', protocols: ['x'] } }),
      '$.variables.A.protocols: unknown property for type "integer"',
    ],
    [
      'required not boolean',
      schemaWith({ A: { type: 'string', required: 'yes' } }),
      '$.variables.A.required: expected a boolean',
    ],
    [
      'secret not boolean',
      schemaWith({ A: { type: 'string', secret: 1 } }),
      '$.variables.A.secret: expected a boolean',
    ],
    [
      'description not string',
      schemaWith({ A: { type: 'string', description: 1 } }),
      '$.variables.A.description: expected a string',
    ],
    [
      'min not number',
      schemaWith({ A: { type: 'number', min: '1' } }),
      '$.variables.A.min: expected a number',
    ],
    [
      'max not finite',
      '{"variables":{"A":{"type":"number","max":1e999}}}',
      '$.variables.A.max: expected a number',
    ],
    [
      'fractional integer bound',
      schemaWith({ A: { type: 'integer', max: 1.5 } }),
      '$.variables.A.max: expected an integer',
    ],
    [
      'min greater than max',
      schemaWith({ A: { type: 'integer', min: 5, max: 1 } }),
      '$.variables.A.min: must not be greater than max',
    ],
    [
      'negative minLength',
      schemaWith({ A: { type: 'string', minLength: -1 } }),
      '$.variables.A.minLength: expected a non-negative integer',
    ],
    [
      'fractional maxLength',
      schemaWith({ A: { type: 'string', maxLength: 1.5 } }),
      '$.variables.A.maxLength: expected a non-negative integer',
    ],
    [
      'minLength greater than maxLength',
      schemaWith({ A: { type: 'string', minLength: 5, maxLength: 1 } }),
      '$.variables.A.minLength: must not be greater than maxLength',
    ],
    [
      'invalid regex',
      schemaWith({ A: { type: 'string', pattern: '([a-' } }),
      '$.variables.A.pattern: invalid regular expression',
    ],
    [
      'pattern not string',
      schemaWith({ A: { type: 'string', pattern: 1 } }),
      '$.variables.A.pattern: expected a string',
    ],
    [
      'enum without values',
      schemaWith({ A: { type: 'enum' } }),
      '$.variables.A: missing required property "values"',
    ],
    [
      'empty enum values',
      schemaWith({ A: { type: 'enum', values: [] } }),
      '$.variables.A.values: expected a non-empty array',
    ],
    [
      'non-string enum value',
      schemaWith({ A: { type: 'enum', values: ['a', 2] } }),
      '$.variables.A.values[1]: expected a string',
    ],
    [
      'duplicate enum value',
      schemaWith({ A: { type: 'enum', values: ['a', 'a'] } }),
      '$.variables.A.values[1]: duplicate entry',
    ],
    [
      'protocols not array',
      schemaWith({ A: { type: 'url', protocols: 'https' } }),
      '$.variables.A.protocols: expected a non-empty array',
    ],
    [
      'bad protocol',
      schemaWith({ A: { type: 'url', protocols: ['https:'] } }),
      '$.variables.A.protocols[0]: expected a URL scheme name',
    ],
  ];

  it.each(cases)('%s', (_name, json, message) => {
    expect(() => parseSchema(json, 'env.schema.json')).toThrow(UsageError);
    expect(() => parseSchema(json, 'env.schema.json')).toThrow(`env.schema.json: ${message}`);
  });

  it('does not echo invalid JSON content', () => {
    expect(() => parseSchema('{"variables": fake-secret-value-123}', 's.json')).toThrow(
      /^s\.json: invalid JSON$/,
    );
  });
});

describe('loadSchemaFile', () => {
  it('reads a schema from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dotenv-audit-schema-'));
    const path = join(dir, 'env.schema.json');
    writeFileSync(path, schemaWith({ A: { type: 'string' } }));
    expect(loadSchemaFile(path).variables.has('A')).toBe(true);
  });

  it('reports a missing file as a usage error', () => {
    expect(() => loadSchemaFile('does-not-exist.json')).toThrow(
      'cannot read does-not-exist.json: file not found',
    );
  });
});

type ValueCase = [
  definition: Record<string, unknown>,
  valid: string[],
  invalid: string[],
  message: string,
];

const valueCases: Record<string, ValueCase> = {
  string: [{ type: 'string' }, ['', 'anything at all'], [], ''],
  'string minLength': [
    { type: 'string', minLength: 3 },
    ['abc', 'äöü'],
    ['ab'],
    'expected at least 3 characters',
  ],
  'string maxLength': [
    { type: 'string', maxLength: 3 },
    ['abc', ''],
    ['abcd'],
    'expected at most 3 characters',
  ],
  'string length range': [
    { type: 'string', minLength: 1, maxLength: 2 },
    ['a', 'ab'],
    ['', 'abc'],
    'expected between 1 and 2 characters',
  ],
  'string pattern': [
    { type: 'string', pattern: '^sk_' },
    ['sk_live'],
    ['pk_live', 'xsk_'],
    'expected to match the pattern /^sk_/',
  ],
  integer: [
    { type: 'integer' },
    ['0', '-5', '+7', '12345678901234567890'],
    ['1.5', 'three', '', ' 1', '1e3', '0x10'],
    'expected an integer',
  ],
  'integer range': [
    { type: 'integer', min: 1, max: 64 },
    ['1', '64'],
    ['0', '65'],
    'expected an integer between 1 and 64',
  ],
  'integer min': [{ type: 'integer', min: 1 }, ['1'], ['0'], 'expected an integer of at least 1'],
  'integer max': [{ type: 'integer', max: 1 }, ['1'], ['2'], 'expected an integer of at most 1'],
  number: [
    { type: 'number' },
    ['1', '-1.5', '.5', '5.', '1e3', '2.5E-2'],
    ['abc', 'Infinity', 'NaN', '0x10', '', '1e999', '1.2.3'],
    'expected a number',
  ],
  'number range': [
    { type: 'number', min: 0, max: 1 },
    ['0', '0.5', '1'],
    ['-0.1', '1.01'],
    'expected a number between 0 and 1',
  ],
  boolean: [
    { type: 'boolean' },
    ['true', 'FALSE', '1', '0', 'yes', 'No'],
    ['on', 'off', 'y', ''],
    'expected a boolean (true, false, 1, 0, yes or no)',
  ],
  port: [
    { type: 'port' },
    ['1', '80', '65535'],
    ['0', '65536', '-1', '+80', 'http', '8.0', ''],
    'expected an integer between 1 and 65535',
  ],
  url: [
    { type: 'url' },
    ['https://example.test/path', 'postgres://u:p@localhost/db', 'mailto:a@b.c'],
    ['not a url', '/relative', ''],
    'expected a URL',
  ],
  'url protocols': [
    { type: 'url', protocols: ['postgres', 'postgresql'] },
    ['postgres://localhost/db', 'POSTGRESQL://localhost/db'],
    ['mysql://localhost/db', 'nope'],
    'expected a URL with protocol postgres or postgresql',
  ],
  email: [
    { type: 'email' },
    ['admin@example.test', 'first.last+tag@sub.example.test'],
    [
      'admin',
      'admin@localhost',
      'a b@example.test',
      'a@@example.test',
      'a@example.',
      '@example.test',
    ],
    'expected an email address',
  ],
  enum: [
    { type: 'enum', values: ['development', 'production'] },
    ['development', 'production'],
    ['Development', 'test', ''],
    'expected one of: development, production',
  ],
  json: [
    { type: 'json' },
    ['{"a":1}', '[]', '1', '"x"', 'null'],
    ['{a:1}', '', 'undefined'],
    'expected valid JSON',
  ],
};

describe('validateValue', () => {
  describe.each(Object.entries(valueCases))(
    '%s',
    (_name, [definition, valid, invalid, message]) => {
      const variable = spec(definition);
      it.each(valid)('accepts %j', (value) => {
        expect(validateValue(variable, value)).toBeUndefined();
      });
      if (invalid.length > 0) {
        it.each(invalid)('rejects %j', (value) => {
          const result = validateValue(variable, value);
          expect(result).toBe(message);
          // Short values like "y" can occur in any sentence; longer ones must not be echoed.
          if (value.length >= 4) expect(result).not.toContain(value);
        });
      }
    },
  );
});
