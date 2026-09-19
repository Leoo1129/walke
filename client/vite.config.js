import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend the dev server proxies to (override when the API runs elsewhere, e.g. in Docker)
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
