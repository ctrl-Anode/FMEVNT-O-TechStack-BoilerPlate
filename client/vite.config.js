import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: false },
      '/uploads': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: false }
    }
  },
  build: {
    sourcemap: true
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.js']
  }
});
