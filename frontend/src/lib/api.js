import useStore from '../store/useStore.js'
import { normalizeBaseUrl } from './baseUrl.js'

// FIXED: Use VITE_API_URL environment variable for API calls
// Empty → same-origin (works with the Vite dev proxy / hosted rewrites)
const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_URL)

async function request(path, options = {}) {
  const token = useStore.getState().user?.token
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let res
  try {
    // FIXED: Added API_BASE prefix to all API calls
    res = await fetch(`${API_BASE}/api${path}`, { ...options, headers })
  } catch {
    // Network-level failure (offline, DNS, server down) — friendly message;
    // lib/toast.js also sanitizes, this just guarantees a clean origin string.
    throw new Error('Cannot reach the server — please check your connection.')
  }

  let data
  try {
    data = await res.json()
  } catch {
    // Non-JSON response (proxy error page, HTML 5xx) — treat as server fault
    throw new Error(res.ok ? 'Unexpected response from the server.' : `Server error (${res.status}) — please try again shortly.`)
  }

  if (!res.ok) throw new Error(data.error || 'Request failed — please try again.')
  return data
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}

// On-demand AI endpoints (server-side cached — repeated clicks don't re-bill the AI)
export const identifyAd             = (adId) => api.post(`/ads/${adId}/identify`)
export const getSourcingAdvice      = (slug) => api.post(`/products/${slug}/sourcing-advice`)
// Product Hunt (winning products): identify from the product's best representative ad
export const identifyWinningProduct = ({ productName, category }) =>
  api.post('/products/winning/identify', { productName, category })
