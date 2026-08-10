// FIXED: Use VITE_API_URL environment variable for API calls
const API_BASE = import.meta.env.VITE_API_URL || ''

import useStore from '../store/useStore.js'

function getToken() {
  return useStore.getState().user?.token
}

function normalizeAlert(a) {
  return {
    id: a._id,
    city: a.city || 'All',
    category: a.category || 'All',
    minScore: a.minWinScore ?? 75,
    notifyVia: a.channel || 'email',
    active: a.isActive !== false,
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
  }
}

export async function fetchAlerts() {
  const token = getToken()
  if (!token) return []
  // FIXED: Added API_BASE prefix
  const res = await fetch(`${API_BASE}/api/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  if (!data.success) return []
  return (data.data?.alerts || []).map(normalizeAlert)
}

export async function createAlert(alertData) {
  const token = getToken()
  if (!token) throw new Error('Please log in to create alerts')

  const body = {
    city: alertData.city === 'All' ? undefined : alertData.city,
    category: alertData.category === 'All' ? undefined : alertData.category,
    minWinScore: alertData.minScore,
    channel: alertData.notifyVia,
  }

  // FIXED: Added API_BASE prefix
  const res = await fetch(`${API_BASE}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to create alert')
  return normalizeAlert(data.data.alert)
}

export async function deleteAlert(id) {
  const token = getToken()
  if (!token) throw new Error('Please log in to delete alerts')
  // FIXED: Added API_BASE prefix
  const res = await fetch(`${API_BASE}/api/alerts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete alert')
  return { success: true }
}

export async function fetchAlertHistory() {
  const store = useStore.getState()
  const token = store.user?.token
  if (!token) return []
  await store.fetchAlertHistory()
  return useStore.getState().alertHistory || []
}
