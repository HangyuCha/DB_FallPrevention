import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy backend API during dev to avoid CORS and absolute URLs
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Some video stream paths are absolute from Flask; keep them accessible
      // You can optionally proxy streams as well if you prefer same-origin
      // '/video_stream': { target: 'http://localhost:5000', changeOrigin: true, secure: false },
    }
  }
});
