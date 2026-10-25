import { describe, expect, it } from 'vitest';
import { isPlaceholder, isSecretLookingKey } from '../../src/placeholders.js';

describe('isSecretLookingKey', () => {
  it.each([
    'DB_PASSWORD',
    'db_pass',
    'PASSWD_NOT',
    'CLIENT_SECRET',
    'GITHUB_TOKEN',
    'STRIPE_API_KEY',
    'APIKEY',
    'PRIVATE_KEY',
    'SSH_PRIVATEKEY',
    'AWS_CREDENTIALS',
  ])('flags %s', (key) => {
    expect(isSecretLookingKey(key)).toBe(true);
  });

  it.each(['PORT', 'DATABASE_URL', 'NODE_ENV', 'KEYBOARD', 'API_URL'])('ignores %s', (key) => {
    expect(isSecretLookingKey(key)).toBe(false);
  });

  it('honours an explicit secret flag', () => {
    expect(isSecretLookingKey('STRIPE', true)).toBe(true);
  });
});

describe('isPlaceholder', () => {
  it.each([
    'changeme',
    'CHANGEME',
    'change_me',
    'todo',
    'TODO',
    'replace_me',
    'secret',
    'Password',
    'xxx',
    'XXXXXXXX',
    'your_api_key_here',
    'your-token-here',
    'YOUR_SECRET_HERE',
    '<token>',
    '<your api key>',
    '<>',
    '  changeme  ',
  ])('detects %j', (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each([
    '',
    'xx',
    'sk_live_fake_0123456789',
    'changeme123',
    'my-secret-sauce',
    'passwords',
    'your_here',
    '<incomplete',
    'todo-list-service',
  ])('accepts %j', (value) => {
    expect(isPlaceholder(value)).toBe(false);
  });
});
