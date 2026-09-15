import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 使用相对路径，保证 dist/ 直接双击或托管在任意静态空间都能打开
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1200,
  },
});
