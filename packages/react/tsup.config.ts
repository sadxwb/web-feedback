import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom'],
    // Preserve "use client" so Next.js treats the bundle as a Client Component.
    banner: { js: '"use client";' },
    clean: true,
    target: 'es2022',
  },
  {
    entry: {
      'adapters/jira': 'src/adapters/jira.ts',
      'adapters/webhook': 'src/adapters/webhook.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    platform: 'node',
    target: 'node18',
    external: ['server-only'],
    clean: false,
  },
]);
