import { UsageError } from './errors.js';
import { readTextFile } from './files.js';

export const VARIABLE_TYPES = [
  'string',
  'integer',
  'number',
  'boolean',
  'port',
  'url',
  'email',
  'enum',
  'json',
] as const;

export type VariableType = (typeof VARIABLE_TYPES)[number];

/** A validated variable definition from the schema file. */
export interface VariableSpec {
  type: VariableType;
  required: boolean;
  secret: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  protocols?: string[];
  values?: string[];
}

export interface Schema {
  variables: Map<string, VariableSpec>;
  allowUnknown: boolean;
}

const KEY = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const PROTOCOL = /^[A-Za-z][A-Za-z0-9+.-]*$/;
const COMMON_PROPERTIES = ['type', 'required', 'secret', 'description'];
const TYPE_PROPERTIES: Readonly<Record<VariableType, readonly string[]>> = {
  string: ['minLength', 'maxLength', 'pattern'],
  integer: ['min', 'max'],
  number: ['min', 'max'],
  boolean: [],
  port: [],
  url: ['protocols'],
  email: [],
  enum: ['values'],
  json: [],
};
const TOP_LEVEL_PROPERTIES = ['$schema', 'variables', 'allowUnknown'];

/** Reads and validates a schema file. Throws `UsageError` on any problem. */
export async function loadSchemaFile(path: string): Promise<Schema> {
  return parseSchema(await readTextFile(path), path);
}

/**
 * Parses and strictly validates schema JSON. Error messages are prefixed with
 * `label` and a JSON path such as `$.variables.PORT.min`.
 */
export function parseSchema(text: string, label: string): Schema {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // The engine's message quotes part of the input; keep it out of the output.
    throw new UsageError(`${label}: invalid JSON`);
  }
  return new SchemaReader(label).read(json);
}

type JsonObject = Record<string, unknown>;

class SchemaReader {
  constructor(private readonly label: string) {}

  read(json: unknown): Schema {
    const root = this.object(json, '$');
    this.onlyKnownProperties(root, TOP_LEVEL_PROPERTIES, '$');
    if (root.$schema !== undefined) this.string(root.$schema, '$.$schema');
    const allowUnknown =
      root.allowUnknown === undefined ? true : this.boolean(root.allowUnknown, '$.allowUnknown');
    if (root.variables === undefined) this.fail('$', 'missing required property "variables"');
    const variables = new Map<string, VariableSpec>();
    for (const [key, definition] of Object.entries(this.object(root.variables, '$.variables'))) {
      const path = `$.variables.${key}`;
      if (!KEY.test(key)) this.fail(path, 'variable names must match [A-Za-z_][A-Za-z0-9_.-]*');
      variables.set(key, this.variable(definition, path));
    }
    return { variables, allowUnknown };
  }

  private variable(json: unknown, path: string): VariableSpec {
    const definition = this.object(json, path);
    const type = definition.type;
    if (typeof type !== 'string' || !isVariableType(type)) {
      this.fail(`${path}.type`, `expected one of: ${VARIABLE_TYPES.join(', ')}`);
    }
    this.onlyKnownProperties(
      definition,
      [...COMMON_PROPERTIES, ...TYPE_PROPERTIES[type]],
      path,
      type,
    );
    if (definition.description !== undefined) {
      this.string(definition.description, `${path}.description`);
    }
    const spec: VariableSpec = {
      type,
      required: this.optionalBoolean(definition.required, `${path}.required`, true),
      secret: this.optionalBoolean(definition.secret, `${path}.secret`, false),
    };
    this.lengthConstraints(definition, path, spec);
    this.rangeConstraints(definition, path, spec);
    if (definition.pattern !== undefined) {
      spec.pattern = this.regex(definition.pattern, `${path}.pattern`);
    }
    if (definition.protocols !== undefined) {
      spec.protocols = this.protocols(definition.protocols, `${path}.protocols`);
    }
    if (type === 'enum') {
      if (definition.values === undefined) this.fail(path, 'missing required property "values"');
      spec.values = this.uniqueStrings(definition.values, `${path}.values`);
    }
    return spec;
  }

  private lengthConstraints(definition: JsonObject, path: string, spec: VariableSpec): void {
    if (definition.minLength !== undefined) {
      spec.minLength = this.nonNegativeInteger(definition.minLength, `${path}.minLength`);
    }
    if (definition.maxLength !== undefined) {
      spec.maxLength = this.nonNegativeInteger(definition.maxLength, `${path}.maxLength`);
    }
    if (spec.minLength !== undefined && spec.maxLength !== undefined) {
      if (spec.minLength > spec.maxLength) {
        this.fail(`${path}.minLength`, 'must not be greater than maxLength');
      }
    }
  }

  private rangeConstraints(definition: JsonObject, path: string, spec: VariableSpec): void {
    const integer = spec.type === 'integer';
    if (definition.min !== undefined)
      spec.min = this.number(definition.min, `${path}.min`, integer);
    if (definition.max !== undefined)
      spec.max = this.number(definition.max, `${path}.max`, integer);
    if (spec.min !== undefined && spec.max !== undefined && spec.min > spec.max) {
      this.fail(`${path}.min`, 'must not be greater than max');
    }
  }

  private object(value: unknown, path: string): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this.fail(path, 'expected an object');
    }
    return value as JsonObject;
  }

  private onlyKnownProperties(
    object: JsonObject,
    allowed: readonly string[],
    path: string,
    type?: VariableType,
  ): void {
    for (const property of Object.keys(object)) {
      if (!allowed.includes(property)) {
        const context = type === undefined ? '' : ` for type "${type}"`;
        this.fail(`${path}.${property}`, `unknown property${context}`);
      }
    }
  }

  private string(value: unknown, path: string): string {
    if (typeof value !== 'string') this.fail(path, 'expected a string');
    return value;
  }

  private boolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') this.fail(path, 'expected a boolean');
    return value;
  }

  private optionalBoolean(value: unknown, path: string, fallback: boolean): boolean {
    return value === undefined ? fallback : this.boolean(value, path);
  }

  private number(value: unknown, path: string, integer: boolean): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) this.fail(path, 'expected a number');
    if (integer && !Number.isInteger(value)) this.fail(path, 'expected an integer');
    return value;
  }

  private nonNegativeInteger(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      this.fail(path, 'expected a non-negative integer');
    }
    return value;
  }

  private regex(value: unknown, path: string): RegExp {
    const source = this.string(value, path);
    try {
      return new RegExp(source, 'u');
    } catch {
      this.fail(path, 'invalid regular expression');
    }
  }

  private protocols(value: unknown, path: string): string[] {
    const protocols = this.uniqueStrings(value, path);
    protocols.forEach((protocol, index) => {
      if (!PROTOCOL.test(protocol)) {
        this.fail(`${path}[${index}]`, 'expected a URL scheme name such as "https"');
      }
    });
    return protocols.map((protocol) => protocol.toLowerCase());
  }

  private uniqueStrings(value: unknown, path: string): string[] {
    if (!Array.isArray(value) || value.length === 0) this.fail(path, 'expected a non-empty array');
    const strings = value.map((item: unknown, index) => this.string(item, `${path}[${index}]`));
    strings.forEach((item, index) => {
      if (strings.indexOf(item) !== index) this.fail(`${path}[${index}]`, 'duplicate entry');
    });
    return strings;
  }

  private fail(path: string, message: string): never {
    throw new UsageError(`${this.label}: ${path}: ${message}`);
  }
}

function isVariableType(value: string): value is VariableType {
  return (VARIABLE_TYPES as readonly string[]).includes(value);
}

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const PORT = /^\d+$/;
const BOOLEAN = new Set(['true', 'false', '1', '0', 'yes', 'no']);
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Checks a value against its definition. Returns `undefined` when valid, or a
 * message describing the expectation. The message never contains the value.
 */
export function validateValue(spec: VariableSpec, value: string): string | undefined {
  switch (spec.type) {
    case 'string':
      return validateString(spec, value);
    case 'integer':
      return validateNumber(spec, value, INTEGER, 'an integer');
    case 'number':
      return validateNumber(spec, value, NUMBER, 'a number');
    case 'boolean':
      return BOOLEAN.has(value.toLowerCase())
        ? undefined
        : 'expected a boolean (true, false, 1, 0, yes or no)';
    case 'port':
      return PORT.test(value) && Number(value) >= 1 && Number(value) <= 65535
        ? undefined
        : 'expected an integer between 1 and 65535';
    case 'url':
      return validateUrl(spec, value);
    case 'email':
      return EMAIL.test(value) ? undefined : 'expected an email address';
    case 'enum':
      return spec.values?.includes(value) === true
        ? undefined
        : `expected one of: ${(spec.values ?? []).join(', ')}`;
    case 'json':
      return isJson(value) ? undefined : 'expected valid JSON';
  }
}

function validateString(spec: VariableSpec, value: string): string | undefined {
  const length = [...value].length;
  const { minLength, maxLength } = spec;
  if (
    (minLength !== undefined && length < minLength) ||
    (maxLength !== undefined && length > maxLength)
  ) {
    if (minLength !== undefined && maxLength !== undefined) {
      return `expected between ${minLength} and ${maxLength} characters`;
    }
    return minLength !== undefined
      ? `expected at least ${minLength} characters`
      : `expected at most ${String(maxLength)} characters`;
  }
  if (spec.pattern !== undefined && !spec.pattern.test(value)) {
    return `expected to match the pattern /${spec.pattern.source}/`;
  }
  return undefined;
}

function validateNumber(
  spec: VariableSpec,
  value: string,
  syntax: RegExp,
  noun: string,
): string | undefined {
  const parsed = Number(value);
  const valid =
    syntax.test(value) &&
    Number.isFinite(parsed) &&
    (spec.min === undefined || parsed >= spec.min) &&
    (spec.max === undefined || parsed <= spec.max);
  return valid ? undefined : `expected ${noun}${describeRange(spec.min, spec.max)}`;
}

function describeRange(min: number | undefined, max: number | undefined): string {
  if (min !== undefined && max !== undefined) return ` between ${min} and ${max}`;
  if (min !== undefined) return ` of at least ${min}`;
  if (max !== undefined) return ` of at most ${max}`;
  return '';
}

function validateUrl(spec: VariableSpec, value: string): string | undefined {
  const protocols = spec.protocols;
  const expectation =
    protocols === undefined
      ? 'expected a URL'
      : `expected a URL with protocol ${protocols.join(' or ')}`;
  if (!URL.canParse(value)) return expectation;
  if (protocols === undefined) return undefined;
  const scheme = new URL(value).protocol.slice(0, -1);
  return protocols.includes(scheme) ? undefined : expectation;
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
