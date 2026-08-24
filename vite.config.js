import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        404: resolve(root, '404.html'),
        500: resolve(root, '500.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
