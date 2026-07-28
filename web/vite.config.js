import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 所有 /api 开头的请求自动转发到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 上传的图片也转发到后端
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
