/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // With VITE_API_URL left empty the app calls /api on its own origin, and
      // the dev server forwards those calls to the backend. No CORS involved.
      // 127.0.0.1 rather than localhost: on Windows, proxying to "localhost"
      // (which Node resolves to IPv6 first) added about two seconds to every
      // API call. Going straight to IPv4 avoids it.
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
