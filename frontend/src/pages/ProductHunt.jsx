import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiRefreshCw, FiMapPin, FiAlertCircle } from 'react-icons/fi'
import toast from '../lib/toast.js'
import AdWinnerCard from '../components/AdWinnerCard.jsx'
import AdScoreBreakdownModal from '../components/AdScoreBreakdownModal.jsx'
import AIReportModal from '../components/AIReportModal.jsx'
import useStore from '../store/useStore.js'

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
]

const PER_PAGE = 12

async function fetchAdWinners(city, bust) {
  const params = new URLSearchParams({ limit: '50' })
  if (city) params.set('city', city)
  if (bust) params.set('bust', '1')
  const res  = await fetch(`/api/products/winning?${params}`)
  const body = await res.json()
  if (!body.success) throw new Error(body.error || 'Failed to load winning products')
  return body.data
}

function StatsBanner({ stats, selectedCity, cityCoverage, lastUpdated, isFetching, onRefresh, scraping, onScrape }) {
  const updated   = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    : null
  const cityCount = selectedCity && cityCoverage ? cityCoverage[selectedCity] : null

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl border"
      style={{ backgroundColor: 'rgba(200,245,66,0.04)', borderColor: 'rgba(200,245,66,0.15)' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.2em]">
          Live FB Ads Intelligence
        </span>
      </div>
      {stats && (
        <>
          <span className="font-mono-label text-[10px] text-[var(--color-moss)]">{stats.totalAds} ads</span>
          <span className="font-mono-label text-[10px] text-[var(--color-moss)]">{stats.uniqueAdvertisers} advertisers</span>
          <span className="font-mono-label text-[10px] text-[var(--color-moss)]">{stats.categories} categories</span>
          {stats.maxDaysRunning > 0 && (
            <span className="font-mono-label text-[10px] text-[var(--color-moss)]">up to {stats.maxDaysRunning}d running</span>
          )}
        </>
      )}
      {selectedCity && (
        <span
          className="font-mono-label text-[9px] font-medium px-1.5 py-0.5 rounded-full border"
          style={cityCount
            ? { backgroundColor: 'rgba(200,245,66,0.1)', color: 'var(--color-acid)', borderColor: 'rgba(200,245,66,0.3)' }
            : { backgroundColor: 'rgba(249,115,22,0.1)', color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' }
          }
        >
          {cityCount ? `${cityCount} ads in ${selectedCity}` : `No tagged ads for ${selectedCity}`}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {updated && (
          <span className="font-mono-label text-[9px] text-[var(--color-moss)]">Updated {updated}</span>
        )}
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="p-1.5 rounded-lg transition-all disabled:opacity-40 text-[var(--color-moss)] hover:text-[var(--color-acid)] hover:bg-[var(--color-ink-3)]"
          style={{ border: '1px solid var(--color-ink-4)' }}
          title="Refresh cached data"
        >
          <FiRefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onScrape}
          disabled={scraping || isFetching}
          className="btn-shine flex items-center gap-1.5 px-3 py-1.5 font-mono-label text-[10px] uppercase tracking-[0.15em] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-acid)', color: 'var(--color-ink)' }}
        >
          {scraping ? (
            <><FiRefreshCw size={11} className="animate-spin" /> Scraping...</>
          ) : (
            <>Refresh Data</>
          )}
        </button>
      </div>
    </div>
  )
}

function CityDropdown({ value, onChange, cityCoverage }) {
  return (
    <div className="flex items-center gap-2">
      <FiMapPin size={13} style={{ color: 'var(--color-moss)' }} className="flex-shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-body text-sm py-2 px-3 rounded-lg outline-none transition-all w-auto min-w-40"
        style={{
          backgroundColor: 'var(--color-ink-3)',
          border: '1px solid var(--color-ink-4)',
          color: 'var(--color-bone)',
        }}
      >
        <option value="">All Cities</option>
        {CITIES.map((c) => {
          const count = cityCoverage?.[c]
          return (
            <option key={c} value={c}>
              {c}{count ? ` (${count})` : ''}
            </option>
          )
        })}
      </select>
    </div>
  )
}

function EmptyState({ city, onScrape, scraping }) {
  return (
    <div className="glass-card text-center py-16">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: 'rgba(200,245,66,0.08)' }}
      >
        <FiRefreshCw size={24} style={{ color: 'var(--color-acid)', opacity: 0.5 }} />
      </div>
      {city ? (
        <>
          <p className="font-display font-bold text-[var(--color-bone)] mb-1">No city-tagged ads for {city}</p>
          <p className="font-body text-sm text-[var(--color-moss)] max-w-sm mx-auto leading-relaxed">
            Only ads mentioning <span className="text-[var(--color-smoke)]">{city}</span> appear here.
            Try <span className="text-[var(--color-smoke)]">All Cities</span> to see all data.
          </p>
        </>
      ) : (
        <>
          <p className="font-display font-bold text-[var(--color-bone)] mb-2">No winning products found yet</p>
          <p className="font-body text-sm text-[var(--color-moss)] max-w-sm mx-auto leading-relaxed mb-5">
            Click <span className="text-[var(--color-acid)] font-medium">Refresh Data</span> to pull the latest
            Facebook Ad Library data and detect winning products automatically.
          </p>
          <button
            onClick={onScrape}
            disabled={scraping}
            className="btn-shine inline-flex items-center gap-2 px-5 py-2.5 font-mono-label text-[10px] uppercase tracking-[0.15em] rounded-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-acid)', color: 'var(--color-ink)' }}
          >
            {scraping ? <><FiRefreshCw size={14} className="animate-spin" /> Scraping...</> : <>Refresh Data</>}
          </button>
        </>
      )}
    </div>
  )
}

export default function ProductHunt() {
  const user           = useStore((s) => s.user)
  const [selectedCity, setSelectedCity] = useState('')
  const [bustKey,      setBustKey]      = useState(0)
  const [page,         setPage]         = useState(1)
  const [scraping,     setScraping]     = useState(false)
  const [scoreProduct, setScoreProduct] = useState(null)
  const [aiProduct,    setAiProduct]    = useState(null)
  const [aiReport,     setAiReport]     = useState(null)
  const [aiLoading,    setAiLoading]    = useState(false)

  const { data: adsData, isLoading, isFetching, refetch } = useQuery({
    queryKey:  ['adWinners', selectedCity, bustKey],
    queryFn:   () => fetchAdWinners(selectedCity, bustKey > 0),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  })

  useEffect(() => {
    const id = setInterval(() => refetch(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [refetch])

  const handleRefresh    = useCallback(() => setBustKey((k) => k + 1), [])
  const handleCityChange = useCallback((city) => { setSelectedCity(city); setPage(1) }, [])

  const triggerScrape = useCallback(async () => {
    setScraping(true)
    try {
      const res  = await fetch('/api/scraper/trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scraper: 'facebookAds' }),
      })
      const body = await res.json()
      if (body.success) {
        toast.success('Scrape started — data will refresh in ~30 seconds')
        setTimeout(() => { setBustKey((k) => k + 1); setScraping(false) }, 30000)
      } else {
        toast.error(body.error || 'Scrape failed')
        setScraping(false)
      }
    } catch {
      toast.error('Could not reach scraper — check backend status')
      setScraping(false)
    }
  }, [])

  const handleViewScore = useCallback((product) => setScoreProduct(product), [])

  const handleViewAI = useCallback(async (product) => {
    if (!user?.token) { toast.error('Please log in to use AI Report'); return }
    setAiProduct(product)
    setAiReport(null)
    setAiLoading(true)
    try {
      const res  = await fetch('/api/ai/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({
          productName: product.name,
          productData: { category: product.category, winScore: product.winScore, activeAds: product.totalAds },
        }),
      })
      const body = await res.json()
      if (!body.success) throw new Error(body.error || 'AI analysis failed')
      const a = body.data.analysis
      setAiReport({
        profitAnalysis: { buyPrice: a.buyPrice, sellPrice: a.sellPrice, recommendedPlatform: a.platforms?.[0]?.name || 'Daraz' },
        adCopy: { english: a.adCopyEN, urdu: a.adCopyUR },
        marketPotential:  a.summary,
        competitorAlert:  a.competitors ? `${a.competitors} active sellers competing in Pakistan` : null,
        suppliers:        a.suppliers    || [],
        adGuide:          a.adGuide      || null,
        adGuideSource:    a.adGuideSource || 'local',
      })
    } catch (err) {
      toast.error(err.message || 'AI analysis failed')
      setAiProduct(null)
    } finally {
      setAiLoading(false)
    }
  }, [user])

  const adWinners      = adsData?.products || []
  const displayed      = adWinners.slice(0, page * PER_PAGE)
  const hasMore        = adWinners.length > displayed.length
  const aiModalProduct = aiProduct ? { ...aiProduct, priceMin: aiReport?.profitAnalysis?.buyPrice || 0, priceMax: aiReport?.profitAnalysis?.sellPrice || 0, competitorCount: aiProduct.advertiserCount || 0 } : null

  return (
    <div className="space-y-6 animate-reveal">
      <div>
        <p className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.3em] mb-1">
          — Product Intel —
        </p>
        <h1 className="font-display font-bold text-2xl text-[var(--color-bone)] tracking-tight">Today's Winning Products</h1>
        <p className="font-body text-sm text-[var(--color-moss)] mt-0.5">
          Hunted live from the Facebook Ad Library — scored by advertiser diversity, volume, longevity and spend signals
        </p>
      </div>

      {/* Controls */}
      <div
        className="glass-card p-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.15em]">Filter by city:</span>
          <CityDropdown value={selectedCity} onChange={handleCityChange} cityCoverage={adsData?.cityCoverage} />
          {selectedCity && (
            <button
              onClick={() => handleCityChange('')}
              className="font-mono-label text-[9px] text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors uppercase tracking-[0.15em]"
            >
              Clear
            </button>
          )}
        </div>
        {!isLoading && (
          <p className="font-body text-sm text-[var(--color-moss)]">
            <span className="text-[var(--color-bone)] font-medium">{adWinners.length}</span>{' '}
            {selectedCity ? `categories in ${selectedCity}` : 'winning categories'}
          </p>
        )}
      </div>

      <StatsBanner
        stats={adsData?.stats}
        selectedCity={selectedCity}
        cityCoverage={adsData?.cityCoverage}
        lastUpdated={adsData?.lastUpdated}
        isFetching={isFetching}
        onRefresh={handleRefresh}
        scraping={scraping}
        onScrape={triggerScrape}
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-72 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl" style={{ backgroundColor: 'var(--color-ink-3)' }} />
                <div className="flex-1">
                  <div className="h-4 rounded w-3/4 mb-1.5" style={{ backgroundColor: 'var(--color-ink-3)' }} />
                  <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--color-ink-3)' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[0, 1, 2].map((j) => <div key={j} className="h-14 rounded-lg" style={{ backgroundColor: 'var(--color-ink-3)' }} />)}
              </div>
              <div className="h-8 rounded-lg" style={{ backgroundColor: 'var(--color-ink-3)' }} />
              <div className="mt-3 h-8 rounded-lg" style={{ backgroundColor: 'var(--color-ink-3)' }} />
            </div>
          ))}
        </div>
      ) : adWinners.length === 0 ? (
        <EmptyState city={selectedCity} onScrape={triggerScrape} scraping={scraping} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map((p) => (
              <AdWinnerCard key={p.id} product={p} onViewScore={handleViewScore} onViewAI={handleViewAI} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage((n) => n + 1)}
                className="font-mono-label text-[10px] uppercase tracking-[0.2em] px-8 py-3 rounded-xl border transition-all hover:bg-[var(--color-ink-3)]"
                style={{ color: 'var(--color-smoke)', borderColor: 'var(--color-ink-4)' }}
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* AI loading overlay */}
      {aiLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,17,10,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card p-8 flex flex-col items-center gap-4 max-w-xs text-center">
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--color-ink-4)', borderTopColor: 'var(--color-acid)' }}
            />
            <p className="font-display font-bold text-[var(--color-bone)]">Generating AI Report</p>
            <p className="font-body text-sm text-[var(--color-moss)]">Analyzing {aiProduct?.name} for Pakistan market...</p>
          </div>
        </div>
      )}

      {scoreProduct && (
        <AdScoreBreakdownModal product={scoreProduct} onClose={() => setScoreProduct(null)} />
      )}
      {aiProduct && aiReport && !aiLoading && (
        <AIReportModal product={aiModalProduct} report={aiReport} onClose={() => { setAiProduct(null); setAiReport(null) }} />
      )}
    </div>
  )
}
