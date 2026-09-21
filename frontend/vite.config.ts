/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // With VITE_API_URL left empty the app calls /api on its own origin, and the
  // dev (or preview) server forwards those calls to the backend. No CORS involved.
  // 127.0.0.1 rather than localhost: on Windows, proxying to "localhost" (which
  // Node resolves to IPv6 first) added about two seconds to every API call.
  const apiProxy: Record<string, ProxyOptions> = {
    '/api': {
      target: env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8080',
      changeOrigin: true,
      // From the browser's side these are same-origin requests, so drop the
      // Origin header rather than have the backend judge localhost:5173 or
      // :4173 against its CORS list.
      configure: (proxy) => proxy.on('proxyReq', (request) => request.removeHeader('origin')),
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    // `vite preview` serves the production build; the end-to-end tests run against it.
    preview: {
      proxy: apiProxy,
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
