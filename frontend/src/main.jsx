import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext.jsx'
import App from './App.jsx'
import { normalizeBaseUrl } from './lib/baseUrl.js'
import './index.css'

// ── API base shim (split-host deploys: Render static frontend ↔ API backend) ──
// Many pages call fetch('/api/...') with a same-origin path — fine behind the
// Vite dev proxy or Netlify rewrites, but a static site on Render has no /api.
// When VITE_API_URL is set (baked in at build time by render.yaml), prefix all
// relative '/api/*' requests with the API host. When unset (single-host /
// dev presets) this is a complete no-op. lib/api.js already prefixes itself,
// so it is untouched. Request-object inputs (rare) pass through unchanged.
const API_BASE_SHIM = normalizeBaseUrl(import.meta.env.VITE_API_URL)
if (API_BASE_SHIM) {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return nativeFetch(API_BASE_SHIM + input, init)
    }
    return nativeFetch(input, init)
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
