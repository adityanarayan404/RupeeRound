/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployed API origin, e.g. https://rupeeround-api.onrender.com. Empty in dev (Vite proxies /api). */
  readonly VITE_API_URL?: string
}
