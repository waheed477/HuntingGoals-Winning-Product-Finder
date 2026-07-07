import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiRefreshCw } from 'react-icons/fi'
import ProductCard from '../../components/ProductCard.jsx'
import { CITIES, CATEGORIES } from '../../utils/cityList.js'
import useStore from '../../store/useStore.js'

async function fetchLocalProducts(filters) {
  const params = new URLSearchParams()
  if (filters.city     && filters.city     !== 'All') params.set('city',     filters.city)
  if (filters.category && filters.category !== 'All') params.set('category', filters.category)
  if (filters.minScore > 0) params.set('minScore', filters.minScore)
  params.set('limit', '20')
  const res  = await fetch(`/api/international/local?${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to load local trends')
  return data.data.products
}

export default function LocalTrends() {
  const selectedCity     = useStore((s) => s.selectedCity)
  const selectedCategory = useStore((s) => s.selectedCategory)
  const setSelectedCity     = useStore((s) => s.setSelectedCity)
  const setSelectedCategory = useStore((s) => s.setSelectedCategory)
  const [minScore, setMinScore] = useState(0)

  const { data: products = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['local-trends', selectedCity, selectedCategory, minScore],
    queryFn:  () => fetchLocalProducts({ city: selectedCity, category: selectedCategory, minScore }),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="select-field text-sm py-2 w-auto min-w-32"
        >
          <option value="All">All Cities</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="select-field text-sm py-2 w-auto min-w-36"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Min score:</span>
          <input
            type="range" min={0} max={100} value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-20 accent-primary-500"
          />
          <span className="text-xs text-white w-6">{minScore}</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-72 animate-pulse">
              <div className="w-full h-36 bg-white/5 rounded-xl mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-white font-medium mb-1">No local products found</p>
          <p className="text-gray-500 text-sm">Try adjusting your filters or wait for the next scrape cycle</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p._id} product={{ ...p, id: p._id }} />
          ))}
        </div>
      )}
    </div>
  )
}
