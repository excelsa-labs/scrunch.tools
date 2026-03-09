import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/topic-optimizer/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
