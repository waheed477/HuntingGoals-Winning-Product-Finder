import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiZap, FiTrendingUp, FiRefreshCw } from 'react-icons/fi'
import { CATEGORIES } from '../../utils/cityList.js'
import { formatPKR } from '../../utils/formatPKR.js'

async function fetchOpportunities(category) {
  const params = new URLSearchParams({ limit: '20' })
  if (category && category !== 'All') params.set('category', category)
  const res  = await fetch(`/api/international/opportunities?${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to load opportunities')
  return data.data.opportunities
}

const GAP_STYLES = {
  HIGH:   { pill: 'bg-green-500/20 text-green-400 border-green-500/30',  bar: 'from-green-500 to-emerald-400', label: 'High Gap' },
  MEDIUM: { pill: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', bar: 'from-yellow-500 to-amber-400', label: 'Medium Gap' },
  LOW:    { pill: 'bg-gray-500/20 text-gray-400 border-gray-500/30',     bar: 'from-gray-500 to-gray-400',    label: 'Low Gap' },
}

export default function Opportunities() {
  const [category, setCategory] = useState('All')

  const { data: opps = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['opportunities', category],
    queryFn:  () => fetchOpportunities(category),
    staleTime: 5 * 60_000,
  })

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FiZap className="text-accent-400" size={16} />
          <span className="text-sm text-gray-300">Products trending globally but not yet saturated in Pakistan</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select-field text-sm py-2 w-auto min-w-36"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-52 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-2/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-full mb-2" />
              <div className="h-3 bg-white/5 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : opps.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">⚡</p>
          <p className="text-white font-medium mb-2">No opportunities calculated yet</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Opportunities are calculated from Shopify and Google Shopping data.
            Enable the scrapers to start discovering gaps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {opps.map((opp, i) => {
            const gap    = GAP_STYLES[opp.gap] || GAP_STYLES.LOW
            const rank   = i + 1
            return (
              <div key={`${opp.name}-${i}`} className="glass-card-hover p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 w-5 text-right">#{rank}</span>
                    <FiTrendingUp className="text-accent-400 flex-shrink-0" size={14} />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${gap.pill}`}>
                    {gap.label}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white leading-tight mb-1">{opp.name}</p>
                  <p className="text-xs text-gray-500">{opp.category}</p>
                </div>

                {/* Opportunity Score Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Opportunity Score</span>
                    <span className="text-sm font-bold text-white">{opp.score}/100</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${gap.bar} rounded-full transition-all duration-700`}
                      style={{ width: `${opp.score}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{opp.globalStores || 0}</p>
                    <p className="text-xs text-gray-600">Stores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">${opp.avgPriceUSD || 0}</p>
                    <p className="text-xs text-gray-600">Global</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{opp.localProducts || 0}</p>
                    <p className="text-xs text-gray-600">Local</p>
                  </div>
                </div>

                {/* PKR price hint */}
                {opp.avgPricePKR > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    Est. sell price: <span className="text-white font-medium">{formatPKR(opp.avgPricePKR)}</span> in Pakistan
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
