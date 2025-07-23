import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // ✅ 新增這行


export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const apiBase = process.env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // ✅ 新增這段
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
