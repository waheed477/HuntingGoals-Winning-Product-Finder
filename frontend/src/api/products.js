function normalizePlatform(p) {
  const map = { daraz: 'Daraz', olx: 'OLX', tiktok: 'TikTok', facebook: 'Facebook', instagram: 'Instagram' }
  return map[p?.toLowerCase()] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : p)
}

export function normalizeProduct(p) {
  const trendMap = { rising: 'up', falling: 'down', stable: 'stable' }
  return {
    id: p._id,
    name: p.name,
    image: p.imageUrl || null,
    winScore: p.winScore || 0,
    priceMin: p.priceMin || 0,
    priceMax: p.priceMax || 0,
    trend: trendMap[p.trend] || 'stable',
    trendPct: p.googleTrendSpike || 0,
    platforms: (p.platforms || []).map(normalizePlatform),
    category: p.category || 'General',
    city: Array.isArray(p.cities) ? (p.cities[0] || 'Pakistan') : (p.cities || 'Pakistan'),
    cities: p.cities || [],
    adsRunning: p.activeAds || 0,
    competitors: p.competitorCount || 0,
    topCompetitors: p.topCompetitors || [],
    darazOrders: p.darazOrders || 0,
    tiktokViews: p.tiktokViews || 0,
    slug: p.slug,
    isWinning: p.isWinning || false,
    // Feature 6 & 7: data quality / confidence fields
    confidence: p.confidence || 'medium',
    confidenceScore: p.confidenceScore ?? 0,
    isVerified: p.isVerified ?? false,
    verificationNote: p.verificationNote || null,
    seasonalWarning: p.seasonalWarning || null,
    imageMismatchFlag: p.imageMismatchFlag || false,
  }
}

export async function fetchProducts(city, category, minScore = 0) {
  const params = new URLSearchParams({ limit: '50', sortBy: 'winScore' })
  if (city && city !== 'All') params.set('city', city)
  if (category && category !== 'All') params.set('category', category)
  if (minScore > 0) params.set('minScore', String(minScore))
  const res = await fetch(`/api/products?${params}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch products')
  return (data.data?.products || []).map(normalizeProduct)
}

export async function fetchTopProducts(limit = 10) {
  const res = await fetch(`/api/products?limit=${limit}&sortBy=winScore`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch products')
  return (data.data?.products || []).map(normalizeProduct)
}

export async function fetchProductById(id) {
  const res = await fetch(`/api/products?limit=100`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch products')
  const product = (data.data?.products || []).find(
    (p) => p._id === id || p._id?.toString() === id?.toString()
  )
  if (!product) throw new Error('Product not found')
  return normalizeProduct(product)
}

export async function fetchCityProducts(city) {
  const params = new URLSearchParams({ city, limit: '5', sortBy: 'winScore' })
  const res = await fetch(`/api/products?${params}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch products')
  return (data.data?.products || []).map(normalizeProduct)
}
