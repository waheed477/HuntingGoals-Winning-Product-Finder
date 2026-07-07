import { useState, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEye, FiImage, FiVideo, FiLayout, FiSliders, FiRefreshCw, FiWifi, FiUsers, FiExternalLink, FiKey, FiChevronRight, FiZap } from 'react-icons/fi'
import { CITIES, CATEGORIES } from '../utils/cityList.js'
import { useAdsRealtime } from '../hooks/useAdsRealtime.js'
import useStore from '../store/useStore.js'
import toast from 'react-hot-toast'

const CREATIVE_ICONS = {
  image:    FiImage,
  video:    FiVideo,
  carousel: FiLayout,
}

const SPEND_COLORS = {
  Low:       'bg-blue-500/20 text-blue-400',
  Medium:    'bg-yellow-500/20 text-yellow-400',
  High:      'bg-orange-500/20 text-orange-400',
  'Very High': 'bg-red-500/20 text-red-400',
}

async function fetchAdsFromAPI(filters) {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'All')  params.set('category', filters.category)
  if (filters.city     && filters.city     !== 'All')  params.set('city',     filters.city)
  if (filters.creative && filters.creative !== 'All')  params.set('creative', filters.creative)
  if (filters.platform && filters.platform !== 'all')  params.set('platform', filters.platform)
  if (filters.minDuration > 0) params.set('minDuration', filters.minDuration)
  params.set('limit', '30')

  const res  = await fetch(`/api/ads?${params}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch ads')
  return data.data.ads
}

// ─── Cookie Setup Guide ───────────────────────────────────────────────────────

const STEPS = [
  {
    n: 1,
    title: 'Log in to Facebook',
    body: (
      <>
        Open{' '}
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer"
           className="text-blue-400 hover:underline">
          facebook.com
        </a>{' '}
        in your browser and sign in to any account.
      </>
    ),
  },
  {
    n: 2,
    title: 'Open DevTools → Cookies',
    body: (
      <>
        Press <kbd className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-mono">F12</kbd>{' '}
        to open DevTools, go to the{' '}
        <span className="text-gray-300 font-medium">Application</span> tab, then{' '}
        <span className="text-gray-300 font-medium">Storage → Cookies → https://www.facebook.com</span>.
      </>
    ),
  },
  {
    n: 3,
    title: 'Copy two cookie values',
    body: (
      <>
        Find and copy the value of{' '}
        <code className="bg-white/10 text-orange-300 px-1 rounded text-xs">c_user</code>{' '}
        and{' '}
        <code className="bg-white/10 text-orange-300 px-1 rounded text-xs">xs</code>.
        These are your session identifiers.
      </>
    ),
  },
  {
    n: 4,
    title: 'Add secret in Replit',
    body: (
      <>
        Go to <span className="text-gray-300 font-medium">Replit → Tools → Secrets</span> and add:
        <div className="mt-2 bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-xs text-green-300 leading-relaxed select-all">
          Key: FB_SESSION_COOKIE<br />
          Value: c_user=<span className="text-orange-300">PASTE_C_USER_VALUE</span>; xs=<span className="text-orange-300">PASTE_XS_VALUE</span>
        </div>
      </>
    ),
  },
  {
    n: 5,
    title: 'Restart Socket Server',
    body: (
      <>
        In Replit, stop and restart the{' '}
        <span className="text-gray-300 font-medium">Socket Server</span> workflow so it
        picks up the new secret. Ads will appear within a few minutes.
      </>
    ),
  },
]

function FbCookieGuide() {
  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <FiKey className="text-blue-400" size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white mb-1">
            Enable Live Facebook Ad Scraping
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Hunting Goals uses Puppeteer + your Facebook session cookie to read the public
            Ad Library. No ads are posted or modified. Setup takes under 2 minutes.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {STEPS.map(({ n, title, body }) => (
          <div key={n} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mt-0.5">
              <span className="text-blue-400 text-xs font-bold">{n}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white mb-0.5">{title}</p>
              <div className="text-xs text-gray-400 leading-relaxed">{body}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3.5">
        <p className="text-xs text-yellow-300/80 leading-relaxed">
          <span className="font-semibold text-yellow-300">Security note:</span>{' '}
          Your cookie is stored only in Replit Secrets — never sent to third parties.
          It expires when you log out of Facebook. Rotate it any time by repeating Step 3–4.
        </p>
      </div>

      <div className="pt-1 border-t border-white/5 flex items-center gap-2 text-xs text-gray-600">
        <FiChevronRight size={11} />
        Once set, ads refresh every 6 hours automatically via the scheduled scraper.
      </div>
    </div>
  )
}

// ─── Default filters (for detecting "truly empty" vs "filtered empty") ────────

const DEFAULT_FILTERS = { category: 'All', city: 'All', creative: 'All', platform: 'all', minDuration: 0 }

function filtersAreDefault(f) {
  return (
    f.category    === DEFAULT_FILTERS.category &&
    f.city        === DEFAULT_FILTERS.city &&
    f.creative    === DEFAULT_FILTERS.creative &&
    f.platform    === DEFAULT_FILTERS.platform &&
    f.minDuration === DEFAULT_FILTERS.minDuration
  )
}

const PLATFORM_STYLES = {
  facebook:  { bg: 'bg-blue-500/20 border-blue-500/30',  text: 'text-blue-400',  icon: 'f',  label: 'Facebook'  },
  instagram: { bg: 'bg-pink-500/20 border-pink-500/30',  text: 'text-pink-400',  icon: '✦', label: 'Instagram' },
  tiktok:    { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-400', icon: '♪', label: 'TikTok' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdSpy() {
  const user = useStore((s) => s.user)
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    category:    'All',
    city:        'All',
    creative:    'All',
    platform:    'all',
    minDuration: 0,
  })
  const [durationInput, setDurationInput] = useState(0)
  const [isLive, setIsLive] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const scrapeTimeoutRef = useRef(null)

  const handleSchedulerRan = useCallback(() => {
    setIsScraping(false)
    if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current)
  }, [])

  useAdsRealtime({ onSchedulerRan: handleSchedulerRan })

  const { data: ads = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['ads', filters],
    queryFn:  () => fetchAdsFromAPI(filters),
    staleTime: 60_000,
    retry: 1,
    onSuccess: () => setIsLive(true),
    onError: () => setIsLive(false),
  })

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ads'] })
  }, [queryClient])

  const handleScrapeNow = useCallback(async () => {
    if (isScraping) return
    setIsScraping(true)

    // Safety fallback — reset after 10 minutes if socket event never arrives
    scrapeTimeoutRef.current = setTimeout(() => setIsScraping(false), 10 * 60 * 1000)

    try {
      const res  = await fetch('/api/ads/scrape-all', { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to start scrape')
      toast('Scraping all categories... results will appear shortly', {
        icon: '🔍',
        style: {
          background: '#1e1e3f',
          color: '#fff',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '12px',
          fontSize: '14px',
        },
        duration: 5000,
      })
    } catch (err) {
      setIsScraping(false)
      if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current)
      toast.error(`Could not start scrape: ${err.message}`)
    }
  }, [isScraping])

  const updateFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }))

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Ad Spy</h1>
          <p className="section-subtitle">Facebook ads running 30+ days for Pakistani products</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-600">Updated {lastUpdated}</span>
          )}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
            isLive ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'
          }`}>
            <FiWifi size={11} />
            {isLive ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={handleScrapeNow}
            disabled={isScraping}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/20 border border-primary-500/30 text-primary-300 hover:bg-primary-600/30 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            title="Trigger a fresh scrape of all 8 search terms"
          >
            <FiZap size={12} className={isScraping ? 'animate-pulse' : ''} />
            {isScraping ? 'Scraping...' : 'Scrape Now'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
            title="Refresh display"
          >
            <FiRefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FiSliders className="text-primary-400" size={16} />
          <span className="text-sm font-medium text-gray-300">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="select-field text-sm py-2 w-auto min-w-36"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.city}
            onChange={(e) => updateFilter('city', e.target.value)}
            className="select-field text-sm py-2 w-auto min-w-32"
          >
            <option value="All">All Cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filters.creative}
            onChange={(e) => updateFilter('creative', e.target.value)}
            className="select-field text-sm py-2 w-auto min-w-32"
          >
            {['All', 'image', 'video', 'carousel'].map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Formats' : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={filters.platform}
            onChange={(e) => updateFilter('platform', e.target.value)}
            className="select-field text-sm py-2 w-auto min-w-36"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Min days running:</span>
            <input
              type="range"
              min={0}
              max={60}
              value={durationInput}
              onChange={(e) => {
                setDurationInput(Number(e.target.value))
                updateFilter('minDuration', Number(e.target.value))
              }}
              className="w-24 accent-primary-500"
            />
            <span className="text-xs text-white w-6">{durationInput}</span>
          </div>
        </div>
      </div>

      {/* Scraping progress banner */}
      {isScraping && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
          <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-primary-300">Scraping Facebook Ad Library</p>
            <p className="text-xs text-gray-500 mt-0.5">Checking 8 search terms across all categories. This takes 3–5 minutes — stay on this page or check back later.</p>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-48 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/5 rounded w-full mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : ads.length === 0 ? (
        filtersAreDefault(filters) ? (
          <FbCookieGuide />
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiEye className="text-blue-400/50" size={24} />
            </div>
            <p className="text-white font-medium mb-1">No ads match these filters</p>
            <p className="text-gray-500 text-sm">Try loosening your category, city, or duration filters</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const CreativeIcon = CREATIVE_ICONS[ad.creative] || FiEye
            const plt = PLATFORM_STYLES[ad.platform] || PLATFORM_STYLES.facebook
            return (
              <div key={ad.id || ad.adId} className="glass-card-hover p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${plt.bg} border rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <span className={`${plt.text} text-xs font-bold`}>{plt.icon}</span>
                    </div>
                    <div>
                      <span className={`text-xs font-medium ${plt.text}`}>{plt.label}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SPEND_COLORS[ad.spend] || SPEND_COLORS.Low}`}>
                          {ad.spend} spend
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">{ad.duration}d</span>
                    {/* Only show direct link when directUrl contains a real numeric Facebook ad ID */}
                    {ad.directUrl && ad.directUrl.includes('id=') ? (
                      <a
                        href={ad.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1 ${plt.text} hover:opacity-80 ${plt.bg} rounded-lg transition-all`}
                        title={`View this ad on ${plt.label} Ad Library`}
                      >
                        <FiExternalLink size={12} />
                      </a>
                    ) : (
                      /* Fallback: search the Ad Library by headline keyword */
                      <a
                        href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=PK&q=${encodeURIComponent(ad.headline || ad.productName || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-600 hover:text-gray-400 bg-white/5 rounded-lg transition-all"
                        title="Search Facebook Ad Library by keyword"
                      >
                        <FiExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 leading-tight">{ad.headline}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{ad.description}</p>
                </div>

                {ad.advertiser && (
                  <p className="text-xs text-gray-600 truncate">by {ad.advertiser}</p>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CreativeIcon size={13} />
                    {ad.creative}
                  </div>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500">{ad.city || 'PK'}</span>
                  {ad.competitors > 0 && (
                    <>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <FiUsers size={10} />
                        {ad.competitors} competitors
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
