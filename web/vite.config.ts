import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const cliPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

const fromHere = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __VERSION__: JSON.stringify(cliPackage.version) },
  resolve: {
    alias: {
      // The CLI's own source is the audit engine. Only its pure modules are imported.
      '@core': fromHere('../src'),
      // schema.ts imports files.ts for the CLI-only loadSchemaFile(); the browser never
      // calls it, so node:fs is replaced by a stub that throws if it ever is.
      'node:fs/promises': fromHere('src/engine/node-fs-stub.ts'),
    },
  },
  server: { fs: { allow: ['..'] } },
  build: { target: 'es2022', sourcemap: false },
  worker: { format: 'es' },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
  },
});
