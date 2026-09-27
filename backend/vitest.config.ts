import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: resolve(__dirname),
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', resolve(__dirname, '../tests/**')],
  },
});
