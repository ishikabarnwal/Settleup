/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://api.example.com. Empty means same origin (the dev proxy). */
  readonly VITE_API_URL?: string
  /** Where the dev server proxies /api to when VITE_API_URL is empty. */
  readonly VITE_DEV_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
