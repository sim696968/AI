// vite.config.mjs
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser'
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
