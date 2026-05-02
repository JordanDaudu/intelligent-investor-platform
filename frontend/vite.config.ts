/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config tuned for the Replit environment:
//  - host 0.0.0.0 + port 5000 (the only port exposed by the iframe proxy)
//  - allowedHosts: true so the proxied *.replit.dev / *.replit.app host header
//    passes the dev-server host check
//  - HMR over wss on the Replit-provided public port
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
    headers: {
      'Cache-Control': 'no-store',
    },
    // Forward API + health calls to the NestJS backend during dev so that the
    // frontend can use relative URLs (which is what works behind Replit's
    // iframe proxy in production too — nginx in the prod image proxies the
    // same paths).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
});
