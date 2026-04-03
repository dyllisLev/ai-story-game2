import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@story-game/shared': path.resolve(__dirname, '../packages/shared/dist/index.js'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      'aistorygame.nuc.hmini.me',
      '.hmini.me',
      'localhost',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
