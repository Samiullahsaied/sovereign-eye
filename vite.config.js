import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    outDir: 'dist'
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true
  }
});