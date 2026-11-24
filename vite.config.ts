import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single'
    ? { outDir: 'dist-single' }
    : { chunkSizeWarningLimit: 650, rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } }, // recharts + d3 is ~590 kB on its own
  test: { environment: 'node', include: ['src/tests/**/*.test.ts'], globals: true },
}));
