// FIXED: Use VITE_API_URL environment variable for API calls
const API_BASE = import.meta.env.VITE_API_URL || ''

import { subDays, format } from 'date-fns'

async function fetchAllProductsRaw(limit = 20) {
  try {
    // FIXED: Added API_BASE prefix
    const res = await fetch(`${API_BASE}/api/products?limit=${limit}&sortBy=winScore`)
    if (!res.ok) return []
    const data = await res.json()
    return data.success ? (data.data?.products || []) : []
  } catch {
    return []
  }
}

export async function fetchAllTrends(range = 30) {
  const products = await fetchAllProductsRaw(5)
  if (!products.length) return []

  const results = await Promise.all(
    products.map(async (p) => {
      try {
        // FIXED: Added API_BASE prefix
        const res = await fetch(`${API_BASE}/api/trends/${p._id}?days=${range}`)
        if (!res.ok) return null
        const data = await res.json()
        if (!data.success) return null
        return {
          id: p._id,
          name: p.name,
          data: (data.data?.trends || []).map((t) => ({
            date: format(new Date(t.date), 'MMM d'),
            value: t.dailyScore,
          })),
        }
      } catch {
        return null
      }
    })
  )

  return results.filter(Boolean)
}

export async function fetchCategoryTrends() {
  const products = await fetchAllProductsRaw(100)

  const CATS = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Sports']
  const catAvg = {}
  for (const cat of CATS) {
    const catProds = products.filter((p) => p.category === cat)
    catAvg[cat] = catProds.length
      ? catProds.reduce((s, p) => s + (p.winScore || 50), 0) / catProds.length
      : 50
  }

  return Array.from({ length: 30 }, (_, i) => {
    const entry = { date: format(subDays(new Date(), 29 - i), 'MMM d') }
    CATS.forEach((cat, ci) => {
      const base = catAvg[cat]
      entry[cat] = Math.round(
        base * 10 + Math.sin(i * 0.2 + ci * 1.2) * base * 2 + Math.random() * base
      )
    })
    return entry
  })
}

export async function fetchRisingFalling() {
  const products = await fetchAllProductsRaw(20)

  const rising = products
    .filter((p) => p.trend === 'rising')
    .slice(0, 5)
    .map((p) => ({
      id: p._id,
      name: p.name,
      change: `+${p.googleTrendSpike || Math.round(p.winScore * 0.3)}%`,
      score: p.winScore,
      category: p.category,
    }))

  const falling = products
    .filter((p) => p.trend === 'falling' || (p.trend === 'stable' && p.winScore < 70))
    .slice(0, 5)
    .map((p) => ({
      id: p._id,
      name: p.name,
      change: `-${Math.max(1, Math.round((p.googleTrendSpike || 5) * 0.4))}%`,
      score: p.winScore,
      category: p.category,
    }))

  return { rising, falling }
}

export async function fetchTrends(productId, range = 30) {
  try {
    // FIXED: Added API_BASE prefix
    const res = await fetch(`${API_BASE}/api/trends/${productId}?days=${range}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return {
      name: data.data.product?.name || 'Product',
      data: (data.data?.trends || []).map((t) => ({
        date: format(new Date(t.date), 'MMM d'),
        value: t.dailyScore,
      })),
    }
  } catch {
    return null
  }
}
