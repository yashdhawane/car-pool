// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // <-- make sure this matches your actual entry point
  outDir: 'dist',
  format: ['esm'],
  target: 'es2020',
  sourcemap: true,
  clean: true,
  dts: true, // if you're generating types
});
