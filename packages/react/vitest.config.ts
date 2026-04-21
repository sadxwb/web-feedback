import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws when imported outside the Next.js server build.
      // Replace it with an empty module so adapters can be loaded in tests.
      'server-only': fileURLToPath(
        new URL('./src/__tests__/server-only-stub.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
});
