import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FiPackage, FiTrendingUp, FiBarChart2,
  FiMapPin, FiRefreshCw,
} from 'react-icons/fi'
import SeasonalBanner from '../components/SeasonalBanner.jsx'
import LocalTrends from './DashboardTabs/LocalTrends.jsx'
import useStore from '../store/useStore.js'

const TABS = [
  { id: 'local',         label: 'Local Trends',  flag: '🇵🇰' },
]

const SEASONS = [
  { id: null,           label: 'All', icon: '🌐' },
  { id: 'winter',       label: 'Winter', icon: '❄️' },
  { id: 'summer',       label: 'Summer', icon: '☀️' },
  { id: 'ramadan',      label: 'Ramadan', icon: '🌙' },
  { id: 'wedding',      label: 'Wedding', icon: '💍' },
  { id: 'backToSchool', label: 'School', icon: '🎒' },
]

const STORAGE_KEY = 'trendspy_dashboard_tab'

async function fetchDashboardStats(token) {
  const res  = await fetch('/api/dashboard/stats', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await res.json()
  if (!body.success) throw new Error(body.error || 'Failed to load stats')
  return body.data
}

async function fetchWinners(season, token) {
  const params = new URLSearchParams({ limit: '8' })
  if (season) params.set('season', season)
  const res  = await fetch(`/api/products/winning?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await res.json()
  if (!body.success) throw new Error(body.error || 'Failed to load winners')
  return body.data
}

function StatCard({ icon: Icon, label, value, sub, accentColor }) {
  return (
    <div
      className="glass-card p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(200,245,66,0.06)]"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>
        <span className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
      <p className="font-display font-bold text-2xl text-[var(--color-bone)] tracking-tight">{value}</p>
      <p className="font-mono-label text-[10px] text-[var(--color-moss)] truncate">{sub}</p>
    </div>
  )
}

const SPEND_STYLE = {
  high:   { backgroundColor: 'rgba(200,245,66,0.12)', color: 'var(--color-acid)', borderColor: 'rgba(200,245,66,0.25)' },
  medium: { backgroundColor: 'rgba(200,245,66,0.06)', color: 'var(--color-acid-3)', borderColor: 'rgba(140,185,30,0.25)' },
  low:    { backgroundColor: 'var(--color-ink-3)', color: 'var(--color-moss)', borderColor: 'var(--color-ink-4)' },
}

const PLATFORM_STYLE = {
  instagram: { backgroundColor: 'rgba(219,39,119,0.1)', color: '#f472b6', borderColor: 'rgba(219,39,119,0.25)' },
  facebook:  { backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.25)' },
}

function WinnerRow({ product, rank }) {
  const spendStyle    = SPEND_STYLE[product.spendLevel] || SPEND_STYLE.low
  const platformStyle = PLATFORM_STYLE[product.platform] || PLATFORM_STYLE.facebook

  return (
    <div
      className="py-2.5 border-b last:border-0"
      style={{ borderColor: 'var(--color-ink-4)' }}
    >
      <div className="flex items-start gap-2">
        <span className="font-mono-label text-[10px] text-[var(--color-ink-4)] w-5 text-center flex-shrink-0 mt-0.5">
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body font-medium text-[var(--color-bone)] leading-snug line-clamp-2 mb-1">
            {product.name}
          </p>
          <div className="flex items-center flex-wrap gap-1.5">
            <span
              className="font-mono-label text-[9px] truncate max-w-[100px] text-[var(--color-moss)]"
              title={product.advertiserName}
            >
              {product.advertiserName}
            </span>
            <span style={{ color: 'var(--color-ink-4)' }}>·</span>
            <span className="font-mono-label text-[9px] text-[var(--color-moss)]">
              {product.maxDaysRunning ?? product.daysRunning ?? 0}d
            </span>
            <span
              className="font-mono-label text-[9px] px-1.5 py-0.5 rounded-full border"
              style={spendStyle}
            >
              {product.spendLevel || 'low'}
            </span>
            <span
              className="font-mono-label text-[9px] px-1.5 py-0.5 rounded-full border uppercase"
              style={platformStyle}
            >
              {product.platform === 'instagram' ? 'IG' : 'FB'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryBar({ name, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-body text-xs text-[var(--color-smoke)]">{name}</span>
        <span className="font-mono-label text-[9px] text-[var(--color-moss)]">{count} ads</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-ink-4)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: 'var(--color-acid)' }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user    = useStore((s) => s.user)
  const [activeTab, setActiveTab]       = useState(() => localStorage.getItem(STORAGE_KEY) || 'local')
  const [activeSeason, setActiveSeason] = useState(null)

  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey:  ['dashboard-stats'],
    queryFn:   () => fetchDashboardStats(user?.token),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  })

  const { data: winnersData, isLoading: winnersLoading, isFetching: winnersFetching, refetch: refetchWinners } = useQuery({
    queryKey:  ['dashboard-winners', activeSeason],
    queryFn:   () => fetchWinners(activeSeason, user?.token),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  })

  const handleTabChange = (id) => {
    setActiveTab(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const winners        = winnersData?.products || stats?.topWinners || []
  const topCategory    = stats?.trendingCategories?.[0]?.name || '—'
  const maxCatCount    = stats?.trendingCategories?.[0]?.count || 1
  const seasonCoverage = winnersData?.seasonCoverage || {}

  return (
    <div className="space-y-6 animate-reveal">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.3em] mb-1">
            — Overview —
          </p>
          <h1 className="font-display font-bold text-2xl text-[var(--color-bone)] tracking-tight">Dashboard</h1>
          <p className="font-body text-sm text-[var(--color-moss)] mt-0.5">
            Pakistan e-commerce intelligence — local, global, and opportunity signals
          </p>
        </div>
        <button
          onClick={() => { refetch(); refetchWinners() }}
          disabled={isFetching || winnersFetching}
          className="p-2 rounded-lg transition-all disabled:opacity-50 text-[var(--color-moss)] hover:text-[var(--color-acid)] hover:bg-[var(--color-ink-3)]"
          style={{ border: '1px solid var(--color-ink-4)' }}
          title="Refresh stats"
        >
          <FiRefreshCw size={14} className={(isFetching || winnersFetching) ? 'animate-spin' : ''} />
        </button>
      </div>

      <SeasonalBanner />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FiPackage}
          label="Products Tracked"
          value={isLoading ? '—' : (stats?.totalProducts ?? 0).toLocaleString()}
          sub={stats?.totalAds ? `${stats.totalAds} ads in last 7 days` : 'Loading…'}
          accentColor="var(--color-acid)"
        />
        <StatCard
          icon={FiBarChart2}
          label="Ads Scraped Today"
          value={isLoading ? '—' : (stats?.recentAdsToday ?? 0).toLocaleString()}
          sub="live from Facebook Ad Library"
          accentColor="#60a5fa"
        />
        <StatCard
          icon={FiTrendingUp}
          label="Top Category"
          value={isLoading ? '—' : topCategory}
          sub={stats?.trendingCategories?.[0] ? `${stats.trendingCategories[0].count} ads` : 'Loading…'}
          accentColor="var(--color-acid-3)"
        />
        <StatCard
          icon={FiMapPin}
          label="Cities Active"
          value={isLoading ? '—' : (stats?.cityDemand?.length ?? 0).toString()}
          sub={stats?.cityDemand?.[0] ? `Most active: ${stats.cityDemand[0].city}` : 'city-tagged ads'}
          accentColor="#f97316"
        />
      </div>

      {/* Winners + Categories + Cities */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Winning Products */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiBarChart2 size={15} style={{ color: 'var(--color-acid)' }} />
              <span className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em]">
                Winning Products
              </span>
              {winnersFetching && (
                <FiRefreshCw size={11} className="text-[var(--color-moss)] animate-spin ml-auto" />
              )}
            </div>

            {/* Season filter pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SEASONS.map((s) => {
                const count    = s.id ? (seasonCoverage[s.id] || 0) : null
                const isActive = activeSeason === s.id
                return (
                  <button
                    key={s.id ?? 'all'}
                    onClick={() => setActiveSeason(s.id)}
                    className="flex items-center gap-1 font-mono-label text-[9px] px-2 py-0.5 rounded-full border transition-all duration-150 uppercase tracking-[0.1em]"
                    style={isActive ? {
                      backgroundColor: 'rgba(200,245,66,0.12)',
                      borderColor: 'var(--color-acid-3)',
                      color: 'var(--color-acid)',
                    } : {
                      backgroundColor: 'var(--color-ink-3)',
                      borderColor: 'var(--color-ink-4)',
                      color: 'var(--color-moss)',
                    }}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                    {count > 0 && (
                      <span
                        className="rounded-full px-1 text-[8px] leading-none py-0.5"
                        style={{ backgroundColor: 'var(--color-ink-4)', color: 'var(--color-smoke)' }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {winnersLoading ? (
              <div className="py-6 flex items-center justify-center">
                <FiRefreshCw size={14} className="text-[var(--color-moss)] animate-spin" />
              </div>
            ) : winners.length > 0 ? (
              winners.slice(0, 8).map((p, i) => (
                <WinnerRow key={p.id || p._id || i} product={p} rank={i + 1} />
              ))
            ) : (
              <p className="font-mono-label text-[10px] text-[var(--color-moss)] py-4 text-center uppercase tracking-[0.15em]">
                No winners yet — scraped every 6 hours
              </p>
            )}
          </div>

          {/* Trending Categories */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp size={15} style={{ color: 'var(--color-acid-3)' }} />
              <span className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em]">
                Trending Categories
              </span>
              <span className="ml-auto font-mono-label text-[9px] text-[var(--color-moss)] uppercase tracking-[0.1em]">
                last 7 days
              </span>
            </div>
            {stats.trendingCategories.length > 0 ? (
              <div className="space-y-3">
                {stats.trendingCategories.map((c) => (
                  <CategoryBar key={c.name} name={c.name} count={c.count} max={maxCatCount} />
                ))}
              </div>
            ) : (
              <p className="font-mono-label text-[10px] text-[var(--color-moss)] py-4 text-center uppercase tracking-[0.15em]">
                No category data yet
              </p>
            )}
          </div>

          {/* City Demand */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <FiMapPin size={15} style={{ color: '#f97316' }} />
              <span className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em]">
                City Demand
              </span>
              <span className="ml-auto font-mono-label text-[9px] text-[var(--color-moss)] uppercase tracking-[0.1em]">
                tagged ads
              </span>
            </div>
            {stats.cityDemand.length > 0 ? (
              <div className="space-y-2.5">
                {stats.cityDemand.map((c) => (
                  <div key={c.city} className="flex items-center justify-between gap-3">
                    <span className="font-body text-xs text-[var(--color-smoke)] truncate">{c.city}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className="w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-ink-4)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((c.count / (stats.cityDemand[0]?.count || 1)) * 100)}%`,
                            backgroundColor: '#f9731660',
                          }}
                        />
                      </div>
                      <span className="font-mono-label text-[9px] text-[var(--color-moss)] w-6 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono-label text-[10px] text-[var(--color-moss)] py-4 text-center uppercase tracking-[0.15em]">
                No city-tagged ads yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div
        className="flex items-end gap-1 border-b"
        style={{ borderColor: 'var(--color-ink-4)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 font-mono-label text-[10px] uppercase tracking-[0.15em] rounded-t-xl transition-all duration-200 border-b-0"
            style={activeTab === tab.id ? {
              backgroundColor: 'rgba(200,245,66,0.08)',
              border: '1px solid var(--color-ink-4)',
              borderBottom: 'none',
              color: 'var(--color-acid)',
            } : {
              color: 'var(--color-moss)',
            }}
          >
            <span>{tab.flag}</span>
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="w-1.5 h-1.5 rounded-full pulse-dot"
                style={{ backgroundColor: 'var(--color-acid)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-64">
        {activeTab === 'local'         && <LocalTrends />}
      </div>
    </div>
  )
}
