import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FiPackage, FiBell, FiTrendingUp, FiBarChart2,
  FiMapPin, FiRefreshCw, FiZap,
} from 'react-icons/fi'
import SeasonalBanner from '../components/SeasonalBanner.jsx'
import LocalTrends from './DashboardTabs/LocalTrends.jsx'
import GlobalTrends from './DashboardTabs/GlobalTrends.jsx'
import Opportunities from './DashboardTabs/Opportunities.jsx'
import useStore from '../store/useStore.js'

const TABS = [
  { id: 'local',         label: 'Local Trends',  flag: '🇵🇰' },
  { id: 'global',        label: 'Global Trends', flag: '🌍' },
  { id: 'opportunities', label: 'Opportunities', flag: '⚡' },
]

const SEASONS = [
  { id: null,            label: 'All Seasons', icon: '🌐' },
  { id: 'winter',        label: 'Winter',      icon: '❄️' },
  { id: 'summer',        label: 'Summer',      icon: '☀️' },
  { id: 'ramadan',       label: 'Ramadan/Eid', icon: '🌙' },
  { id: 'wedding',       label: 'Wedding',     icon: '💍' },
  { id: 'backToSchool',  label: 'Back to School', icon: '🎒' },
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

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={`stat-card border ${bg}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={color} size={16} />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  )
}

const SPEND_STYLE = {
  high:   'bg-green-500/15 text-green-400 border border-green-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
  low:    'bg-gray-500/15 text-gray-400 border border-gray-500/25',
}

const SEASON_BADGE = {
  winter:       'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  summer:       'bg-orange-500/15 text-orange-400 border border-orange-500/25',
  ramadan:      'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  wedding:      'bg-pink-500/15 text-pink-400 border border-pink-500/25',
  backToSchool: 'bg-teal-500/15 text-teal-400 border border-teal-500/25',
  general:      'bg-gray-500/15 text-gray-400 border border-gray-500/25',
}

const SEASON_ICON = {
  winter: '❄️', summer: '☀️', ramadan: '🌙',
  wedding: '💍', backToSchool: '🎒', general: '🌐',
}

function WinnerRow({ product, rank }) {
  const spendStyle  = SPEND_STYLE[product.spendLevel] || SPEND_STYLE.low
  const seasonStyle = SEASON_BADGE[product.season]    || SEASON_BADGE.general
  const seasonIcon  = SEASON_ICON[product.season]     || '🌐'
  const isIg        = product.platform === 'instagram'

  return (
    <div className="py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-600 w-5 text-center flex-shrink-0 mt-0.5">#{rank}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug line-clamp-2 mb-1">
            {product.name}
          </p>
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 truncate max-w-[110px]" title={product.advertiserName}>
              {product.advertiserName}
            </span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{product.maxDaysRunning ?? product.daysRunning ?? 0}d</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${spendStyle}`}>
              {product.spendLevel || 'low'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isIg
                ? 'bg-pink-500/15 text-pink-400 border border-pink-500/25'
                : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
            }`}>
              {isIg ? 'IG' : 'FB'}
            </span>
            {product.season && product.season !== 'general' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${seasonStyle}`}>
                {seasonIcon}
              </span>
            )}
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
        <span className="text-xs text-gray-400">{name}</span>
        <span className="text-xs text-gray-600">{count} ads</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user    = useStore((s) => s.user)
  const [activeTab, setActiveTab]     = useState(() => localStorage.getItem(STORAGE_KEY) || 'local')
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

  const winners       = winnersData?.products || stats?.topWinners || []
  const topCategory   = stats?.trendingCategories?.[0]?.name || '—'
  const maxCatCount   = stats?.trendingCategories?.[0]?.count || 1

  // Season coverage counts for badge numbers
  const seasonCoverage = winnersData?.seasonCoverage || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Pakistan e-commerce intelligence — local, global, and opportunity signals</p>
        </div>
        <button
          onClick={() => { refetch(); refetchWinners() }}
          disabled={isFetching || winnersFetching}
          className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
          title="Refresh stats"
        >
          <FiRefreshCw size={14} className={(isFetching || winnersFetching) ? 'animate-spin' : ''} />
        </button>
      </div>

      <SeasonalBanner />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FiPackage}
          label="Products Tracked"
          value={isLoading ? '—' : (stats?.totalProducts ?? 0).toLocaleString()}
          sub={stats?.totalAds ? `${stats.totalAds} ads in last 7 days` : 'Loading…'}
          color="text-primary-400"
          bg="bg-primary-500/10 border-primary-500/20"
        />
        <StatCard
          icon={FiZap}
          label="Ads Scraped Today"
          value={isLoading ? '—' : (stats?.recentAdsToday ?? 0).toLocaleString()}
          sub="live from Facebook Ad Library"
          color="text-accent-400"
          bg="bg-accent-500/10 border-accent-500/20"
        />
        <StatCard
          icon={FiTrendingUp}
          label="Top Category"
          value={isLoading ? '—' : topCategory}
          sub={stats?.trendingCategories?.[0] ? `${stats.trendingCategories[0].count} ads · ${stats.trendingCategories[0].advertisers} advertisers` : 'Loading…'}
          color="text-green-400"
          bg="bg-green-500/10 border-green-500/20"
        />
        <StatCard
          icon={FiMapPin}
          label="Cities Active"
          value={isLoading ? '—' : (stats?.cityDemand?.length ?? 0).toString()}
          sub={stats?.cityDemand?.[0] ? `Most active: ${stats.cityDemand[0].city}` : 'city-tagged ads'}
          color="text-orange-400"
          bg="bg-orange-500/10 border-orange-500/20"
        />
      </div>

      {/* Winners + Categories + Cities row */}
      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Today's Winners with Season Filter */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiBarChart2 size={15} className="text-primary-400" />
              <span className="text-sm font-medium text-gray-300">Winning Products</span>
              {winnersFetching && <FiRefreshCw size={11} className="text-gray-600 animate-spin ml-auto" />}
            </div>

            {/* Season filter pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SEASONS.map((s) => {
                const count = s.id ? (seasonCoverage[s.id] || 0) : null
                const isActive = activeSeason === s.id
                return (
                  <button
                    key={s.id ?? 'all'}
                    onClick={() => setActiveSeason(s.id)}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-600/30 border-primary-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{s.icon}</span>
                    {s.label}
                    {count > 0 && (
                      <span className="bg-white/10 rounded-full px-1 text-[9px] leading-none py-0.5">{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {winnersLoading ? (
              <div className="py-6 flex items-center justify-center">
                <FiRefreshCw size={14} className="text-gray-600 animate-spin" />
              </div>
            ) : winners.length > 0 ? (
              winners.slice(0, 8).map((p, i) => (
                <WinnerRow key={p.id || p._id || i} product={p} rank={i + 1} />
              ))
            ) : (
              <p className="text-xs text-gray-600 py-4 text-center">
                No winners for this season yet — ads are scraped every 6 hours
              </p>
            )}
          </div>

          {/* Trending Categories */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiTrendingUp size={15} className="text-green-400" />
              <span className="text-sm font-medium text-gray-300">Trending Categories</span>
              <span className="ml-auto text-[10px] text-gray-600">last 7 days</span>
            </div>
            {stats.trendingCategories.length > 0 ? (
              <div className="space-y-3">
                {stats.trendingCategories.map((c) => (
                  <CategoryBar key={c.name} name={c.name} count={c.count} max={maxCatCount} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 py-4 text-center">No category data yet</p>
            )}
          </div>

          {/* City Demand */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiMapPin size={15} className="text-orange-400" />
              <span className="text-sm font-medium text-gray-300">City Demand</span>
              <span className="ml-auto text-[10px] text-gray-600">tagged ads</span>
            </div>
            {stats.cityDemand.length > 0 ? (
              <div className="space-y-2">
                {stats.cityDemand.map((c) => (
                  <div key={c.city} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{c.city}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400/60 rounded-full"
                          style={{ width: `${Math.round((c.count / (stats.cityDemand[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-8 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 py-4 text-center">No city-tagged ads yet</p>
            )}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-end gap-1 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-primary-600/25 border border-b-0 border-primary-500/40 text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <span>{tab.flag}</span>
            {tab.label}
            {activeTab === tab.id && (
              <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-64">
        {activeTab === 'local'         && <LocalTrends />}
        {activeTab === 'global'        && <GlobalTrends />}
        {activeTab === 'opportunities' && <Opportunities />}
      </div>
    </div>
  )
}
