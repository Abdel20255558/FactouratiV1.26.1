import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/tva': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tva/, '/.netlify/functions/tva'),
      },
      '/.netlify/functions/tva': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
});
