import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default ({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],
    define: {
      'process.env': {}
    },
    server: {
      port: 3000,
      open: true
    },
    // For production build
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true
    }
  });
};
