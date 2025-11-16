import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/static/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // Python backend server
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    include: ['fabric'], // Ensure Vite pre-bundles fabric
  },
  build: {
    commonjsOptions: {
      include: [/fabric/, /node_modules/], // Treat fabric as CommonJS if needed
    },
  },
});