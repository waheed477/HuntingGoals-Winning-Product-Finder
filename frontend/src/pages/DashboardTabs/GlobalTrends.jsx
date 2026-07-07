import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiStar, FiExternalLink, FiRefreshCw, FiShoppingBag } from 'react-icons/fi'
import { CATEGORIES } from '../../utils/cityList.js'
import { formatPKR } from '../../utils/formatPKR.js'

async function fetchGlobalProducts(filters) {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'All') params.set('category', filters.category)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  params.set('limit', '30')
  const res  = await fetch(`/api/international/global?${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to load global trends')
  return data.data
}

const SOURCE_BADGE = {
  shopify: { label: 'Shopify', bg: 'bg-green-500/20 text-green-400', icon: '🛒' },
  google:  { label: 'Google', bg: 'bg-blue-500/20 text-blue-400',   icon: '🔍' },
}

export default function GlobalTrends() {
  const [category, setCategory] = useState('All')
  const [sortBy,   setSortBy]   = useState('popularity')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['global-trends', category, sortBy],
    queryFn:  () => fetchGlobalProducts({ category, sortBy }),
    staleTime: 5 * 60_000,
  })

  const products = data?.products || []
  const sources  = data?.sources  || {}

  return (
    <div className="space-y-4">
      {/* Filters + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="select-field text-sm py-2 w-auto min-w-36"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="select-field text-sm py-2 w-auto min-w-36"
        >
          <option value="popularity">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price">Lowest Price</option>
          <option value="newest">Recently Added</option>
        </select>
        {(sources.shopify > 0 || sources.google > 0) && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full">{sources.shopify || 0} Shopify</span>
            <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">{sources.google || 0} Google</span>
          </div>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-64 animate-pulse">
              <div className="w-full h-32 bg-white/5 rounded-xl mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🌍</p>
          <p className="text-white font-medium mb-2">No global products yet</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Set <code className="text-primary-400">GOOGLE_SHOPPING_ENABLED=true</code> and{' '}
            <code className="text-primary-400">SHOPIFY_SCRAPER_ENABLED=true</code> to start scraping international products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const badge = SOURCE_BADGE[p.source] || SOURCE_BADGE.google
            return (
              <div key={p.id} className="glass-card-hover p-4 flex flex-col gap-3">
                {/* Image */}
                <div className="relative w-full h-36 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <FiShoppingBag size={32} className="text-gray-700" />
                  )}
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg}`}>
                    {badge.icon} {badge.label}
                  </span>
                  {p.shipsToPakistan && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-green-500/25 text-green-400 rounded-full">
                      Ships to PK
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white leading-tight mb-1 line-clamp-2">{p.name}</p>
                  {p.storeName && <p className="text-xs text-gray-500 mb-2">{p.storeName}</p>}

                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-lg font-bold text-white">${p.priceUSD || 0}</p>
                      <p className="text-xs text-gray-500">{formatPKR(p.pricePKR || 0)}</p>
                    </div>
                    {p.rating > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <FiStar size={12} className="text-yellow-400" />
                        <span className="text-xs text-gray-400">{p.rating.toFixed(1)}</span>
                        {p.reviewCount > 0 && (
                          <span className="text-xs text-gray-600">({p.reviewCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {p.productUrl && (
                  <a
                    href={p.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2 bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-300 text-xs font-medium rounded-xl transition-all"
                  >
                    View Product <FiExternalLink size={12} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
