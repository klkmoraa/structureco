import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    // The quality gate must only observe the real product. Backups, worktrees and
    // vendored copies of the app live beside `src/` and would otherwise be collected,
    // reporting stale failures and inflating the suite by an order of magnitude.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'structureCo/**',
      'structureCo-backup-*/**',
      'structureCo-worktrees/**',
      'structureco-sites/**',
      'structureco-sites-worktrees/**',
      'structureco-design-review/**',
      'structureco-palette-lab/**',
      'structureCo-contexto-*/**',
      'structureCo-documentacion-integral-*/**',
    ],
  },
});
