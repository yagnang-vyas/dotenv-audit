/**
 * Synthetic sample files for the playground. Every value is fake and chosen so
 * the audit demonstrates several findings. Based on the repository's
 * `examples/` directory.
 */
export const SAMPLE_ENV = `# Synthetic sample: no real credentials.
DATABASE_URL=mysql://app:fake-password@localhost/app
PORT=three-thousand
NODE_ENV=
API_KEY=changeme
WORKERS=4
WORKERS=128
FEATURE_FLAGS=beta
this line is not an assignment
`;

export const SAMPLE_EXAMPLE = `# Example configuration. Copy to .env and fill in real values.
DATABASE_URL=postgres://localhost:5432/app
PORT=3000
NODE_ENV=development
DEBUG=false
API_KEY=your_api_key_here
WORKERS=4
ADMIN_EMAIL=admin@example.com
`;

export const SAMPLE_SCHEMA = `{
  "variables": {
    "DATABASE_URL": { "type": "url", "protocols": ["postgres", "postgresql"] },
    "PORT": { "type": "port", "required": false },
    "NODE_ENV": { "type": "enum", "values": ["development", "test", "production"] },
    "DEBUG": { "type": "boolean", "required": false },
    "API_KEY": { "type": "string", "secret": true, "minLength": 20, "pattern": "^sk_" },
    "WORKERS": { "type": "integer", "min": 1, "max": 64 },
    "ADMIN_EMAIL": { "type": "email" }
  },
  "allowUnknown": false
}
`;

export const SAMPLE_STAGING = `# Synthetic staging configuration.
NODE_ENV=production
APP_URL=https://staging.example.test
DATABASE_URL=postgres://staging-db.example.test:5432/app
REDIS_URL=redis://staging-cache.example.test:6379
LOG_LEVEL=debug
SESSION_SECRET=fake-staging-session-secret-000
FEATURE_NEW_CHECKOUT=true
SENTRY_DSN=https://fake-key@sentry.example.test/1
`;

export const SAMPLE_PRODUCTION = `# Synthetic production configuration.
NODE_ENV=production
APP_URL=https://app.example.test
DATABASE_URL=postgres://prod-db.example.test:5432/app
REDIS_URL=redis://staging-cache.example.test:6379
LOG_LEVEL=info
SESSION_SECRET=fake-prod-session-secret-000
SMTP_HOST=smtp.example.test
SENTRY_DSN=https://fake-key@sentry.example.test/1
`;
