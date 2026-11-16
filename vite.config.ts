import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bản thử dùng cổng khác bản chính (5173 / 8787) để hai bản chạy song song được
// mà không tranh cổng của nhau.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
});
