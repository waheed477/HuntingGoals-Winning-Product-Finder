import { useState, useEffect, useCallback } from 'react'
import {
  FiRefreshCw, FiPlay, FiClock, FiDatabase, FiCheckCircle,
  FiAlertCircle, FiWifi, FiWifiOff, FiZap,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

const SCRAPERS = [
  {
    key:      'facebookAds',
    name:     'Facebook Ads',
    schedule: 'Every 6 hours',
    desc:     'Scrapes FB Ad Library for Pakistani product ads',
    color:    'blue',
    resultKey: 'totalSaved',
    resultLabel: 'ads saved',
  },
  {
    key:      'daraz',
    name:     'Daraz',
    schedule: 'Every 12 hours',
    desc:     'Trending products from Daraz.pk',
    color:    'orange',
    resultKey: 'saved',
    resultLabel: 'products',
  },
  {
    key:      'olx',
    name:     'OLX',
    schedule: 'Every 12 hours',
    desc:     'Active listings from OLX Pakistan',
    color:    'teal',
    resultKey: 'saved',
    resultLabel: 'listings',
  },
  {
    key:      'googleTrends',
    name:     'Google Trends',
    schedule: 'Daily at 3 AM',
    desc:     'Pakistan keyword interest over time',
    color:    'green',
    resultKey: 'trends',
    resultLabel: 'queries',
  },
  {
    key:      'news',
    name:     'News',
    schedule: 'Daily at 3 AM',
    desc:     'Dawn & Geo RSS — e-commerce headlines',
    color:    'purple',
    resultKey: 'articles',
    resultLabel: 'articles',
  },
  {
    key:      'suppliers',
    name:     'Suppliers',
    schedule: 'Weekly (Sunday 4 AM)',
    desc:     'Pakistani wholesale supplier refresh',
    color:    'pink',
    resultKey: 'triggered',
    resultLabel: 'triggered',
  },
]

const COLOR_MAP = {
  blue:   { dot: 'bg-blue-400',   border: 'border-blue-500/30',   text: 'text-blue-400',   badge: 'bg-blue-500/15 text-blue-400'   },
  orange: { dot: 'bg-orange-400', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-400' },
  teal:   { dot: 'bg-teal-400',   border: 'border-teal-500/30',   text: 'text-teal-400',   badge: 'bg-teal-500/15 text-teal-400'   },
  green:  { dot: 'bg-green-400',  border: 'border-green-500/30',  text: 'text-green-400',  badge: 'bg-green-500/15 text-green-400'  },
  purple: { dot: 'bg-purple-400', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-400' },
  pink:   { dot: 'bg-pink-400',   border: 'border-pink-500/30',   text: 'text-pink-400',   badge: 'bg-pink-500/15 text-pink-400'   },
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeUntil(iso) {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `in ${hrs}h ${mins % 60}m`
  return `in ${Math.floor(hrs / 24)}d`
}

export default function SchedulerDashboard() {
  const user = useStore((s) => s.user)
  const [status, setStatus]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [triggering, setTriggering] = useState(null)
  const [countdown, setCountdown]   = useState(30)
  const [lastFetched, setLastFetched] = useState(null)

  const fetchStatus = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res  = await fetch('/api/scraper/status')
      const data = await res.json()
      setStatus(data)
      setLastFetched(new Date())
      setCountdown(30)
    } catch {
      toast.error('Could not reach scheduler API')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const poll = setInterval(() => fetchStatus(), 30000)
    return () => clearInterval(poll)
  }, [fetchStatus])

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1000)
    return () => clearInterval(tick)
  }, [])

  const triggerScraper = async (scraperKey, scraperName) => {
    setTriggering(scraperKey)
    try {
      const res  = await fetch('/api/scraper/trigger', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({ scraper: scraperKey }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${scraperName} triggered — results will appear shortly`)
        setTimeout(() => fetchStatus(), 8000)
      } else {
        toast.error(data.error || 'Trigger failed')
      }
    } catch {
      toast.error('Could not reach trigger API')
    } finally {
      setTriggering(null)
    }
  }

  const sched     = status?.scheduler   || {}
  const nextRuns  = status?.nextRuns    || {}
  const stats     = status?.stats       || {}
  const isEnabled = status?.environment?.autoScraperEnabled

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="section-title">Scheduler Dashboard</h1>
          <p className="section-subtitle">Loading scraper status…</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SCRAPERS.map((s) => (
            <div key={s.key} className="glass-card p-5 h-52 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
              <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title">Scheduler Dashboard</h1>
          <p className="section-subtitle">Monitor and manually trigger all auto-scrapers</p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-gray-600">
              Auto-refresh in {countdown}s
            </span>
          )}
          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Scheduler health bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-red-400'}`} />
          <span className="text-sm font-medium text-white">
            Auto Scraper {isEnabled ? 'Active' : 'Disabled'}
          </span>
          {sched.startedAt && (
            <span className="text-xs text-gray-500">
              started {timeAgo(sched.startedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEnabled
            ? <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400"><FiWifi size={11} /> Running on schedule</span>
            : <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-500/15 text-red-400"><FiWifiOff size={11} /> Set AUTO_SCRAPER_ENABLED=true</span>
          }
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Ads',      value: stats.totalAds      ?? '—', icon: FiZap,      color: 'text-blue-400' },
          { label: 'Total Products', value: stats.totalProducts ?? '—', icon: FiDatabase, color: 'text-orange-400' },
          { label: 'Total Suppliers',value: stats.totalSuppliers?? '—', icon: FiDatabase, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-white/5 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value.toLocaleString?.() ?? value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scraper cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SCRAPERS.map((scraper) => {
          const colors    = COLOR_MAP[scraper.color]
          const runData   = sched[scraper.key] || {}
          const lastRun   = runData.lastRun
          const result    = runData.lastResult
          const hasError  = result?.error
          const resultVal = result?.[scraper.resultKey]
          const nextKey   = scraper.key === 'daraz' || scraper.key === 'olx' ? 'darazOlx'
                          : scraper.key === 'googleTrends' || scraper.key === 'news' ? 'dailyScrapers'
                          : scraper.key
          const nextRun   = nextRuns[nextKey]
          const isRunning = triggering === scraper.key

          return (
            <div
              key={scraper.key}
              className={`glass-card-hover flex flex-col border ${lastRun ? colors.border : 'border-white/10'} overflow-hidden`}
            >
              {/* Card header */}
              <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ${lastRun && !hasError ? colors.dot : 'bg-gray-600'}`} />
                    <h3 className="text-sm font-semibold text-white">{scraper.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 ml-4">{scraper.desc}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${colors.badge}`}>
                  {scraper.schedule}
                </span>
              </div>

              {/* Stats */}
              <div className="p-4 flex-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiClock size={11} /> Last run
                  </span>
                  <span className={`text-xs font-medium ${lastRun ? 'text-gray-300' : 'text-gray-600'}`}>
                    {timeAgo(lastRun)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FiZap size={11} /> Next run
                  </span>
                  <span className="text-xs text-gray-400">{timeUntil(nextRun)}</span>
                </div>

                {lastRun && !hasError && resultVal !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FiCheckCircle size={11} /> Last result
                    </span>
                    <span className={`text-xs font-medium ${colors.text}`}>
                      +{typeof resultVal === 'number' ? resultVal.toLocaleString() : resultVal} {scraper.resultLabel}
                    </span>
                  </div>
                )}

                {hasError && (
                  <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <FiAlertCircle size={11} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400 leading-tight">{result.error}</p>
                  </div>
                )}
              </div>

              {/* Trigger button */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => triggerScraper(scraper.key, scraper.name)}
                  disabled={isRunning || !!triggering}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all
                    ${isRunning
                      ? 'bg-white/5 text-gray-500 cursor-wait'
                      : `bg-white/5 border border-white/10 text-gray-300 hover:${colors.text} hover:border-current disabled:opacity-40`
                    }`}
                >
                  {isRunning
                    ? <><FiRefreshCw size={12} className="animate-spin" /> Running…</>
                    : <><FiPlay size={12} /> Run Now</>
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-600 text-center pb-2">
        Status auto-refreshes every 30s. Triggered jobs run in the background — results appear on next refresh.
      </p>
    </div>
  )
}
