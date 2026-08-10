import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FiRefreshCw, FiMapPin, FiZap, FiAlertCircle } from 'react-icons/fi'
import toast from 'react-hot-toast'
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
  const updated = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    : null
  const cityCount = selectedCity && cityCoverage ? cityCoverage[selectedCity] : null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
      <div className="flex items-center gap-1.5">
        <FiZap size={13} className="text-blue-400" />
        <span className="text-xs text-blue-300 font-semibold">Live FB Ads Intelligence</span>
      </div>
      {stats && (
        <>
          <span className="text-[11px] text-gray-500">{stats.totalAds} ads</span>
          <span className="text-[11px] text-gray-500">{stats.uniqueAdvertisers} advertisers</span>
          <span className="text-[11px] text-gray-500">{stats.categories} categories</span>
          {stats.maxDaysRunning > 0 && (
            <span className="text-[11px] text-gray-500">up to {stats.maxDaysRunning}d running</span>
          )}
        </>
      )}
      {selectedCity && (
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
          cityCount
            ? 'text-green-400 bg-green-500/10'
            : 'text-yellow-400 bg-yellow-500/10'
        }`}>
          {cityCount ? `${cityCount} ads in ${selectedCity}` : `No tagged ads for ${selectedCity}`}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        {updated && <span className="text-[11px] text-gray-600">Updated {updated}</span>}
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="p-1.5 text-gray-500 hover:text-white bg-white/5 rounded-lg transition-all disabled:opacity-40"
          title="Refresh cached data"
        >
          <FiRefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onScrape}
          disabled={scraping || isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-all"
        >
          {scraping ? (
            <><FiRefreshCw size={11} className="animate-spin" /> Scraping...</>
          ) : (
            <><FiZap size={11} /> Refresh Data</>
          )}
        </button>
      </div>
    </div>
  )
}

function CityDropdown({ value, onChange, cityCoverage }) {
  return (
    <div className="flex items-center gap-2">
      <FiMapPin size={13} className="text-gray-500 flex-shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field text-sm py-2 w-auto min-w-40"
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
    <div className="text-center py-16 glass-card">
      <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FiZap className="text-blue-400/50" size={24} />
      </div>
      {city ? (
        <>
          <p className="text-white font-medium mb-1">No city-tagged ads for {city}</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Only ads that mention <span className="text-gray-300">{city}</span> in their headline
            appear here. Try <span className="text-gray-300">All Cities</span> to see all data.
          </p>
        </>
      ) : (
        <>
          <p className="text-white font-medium mb-2">No winning products found yet</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed mb-5">
            Click <span className="text-green-400 font-medium">Refresh Data</span> to pull the latest
            Facebook Ad Library data and detect winning products automatically.
          </p>
          <button
            onClick={onScrape}
            disabled={scraping}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all"
          >
            {scraping ? <><FiRefreshCw size={14} className="animate-spin" /> Scraping...</> : <><FiZap size={14} /> Refresh Data</>}
          </button>
        </>
      )}
    </div>
  )
}

export default function ProductHunt() {
  const user              = useStore((s) => s.user)
  const [selectedCity,    setSelectedCity]    = useState('')
  const [bustKey,         setBustKey]         = useState(0)
  const [page,            setPage]            = useState(1)
  const [scraping,        setScraping]        = useState(false)

  const [scoreProduct,    setScoreProduct]    = useState(null)
  const [aiProduct,       setAiProduct]       = useState(null)
  const [aiReport,        setAiReport]        = useState(null)
  const [aiLoading,       setAiLoading]       = useState(false)

  const {
    data:       adsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey:  ['adWinners', selectedCity, bustKey],
    queryFn:   () => fetchAdWinners(selectedCity, bustKey > 0),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  })

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      refetch()
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [refetch])

  const handleRefresh = useCallback(() => {
    setBustKey((k) => k + 1)
  }, [])

  const handleCityChange = useCallback((city) => {
    setSelectedCity(city)
    setPage(1)
  }, [])

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
        setTimeout(() => {
          setBustKey((k) => k + 1)
          setScraping(false)
        }, 30000)
      } else {
        toast.error(body.error || 'Scrape failed')
        setScraping(false)
      }
    } catch {
      toast.error('Could not reach scraper — check backend status')
      setScraping(false)
    }
  }, [])

  const handleViewScore = useCallback((product) => {
    setScoreProduct(product)
  }, [])

  const handleViewAI = useCallback(async (product) => {
    if (!user?.token) {
      toast.error('Please log in to use AI Report')
      return
    }
    setAiProduct(product)
    setAiReport(null)
    setAiLoading(true)

    try {
      const res  = await fetch('/api/ai/analyze', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          productName: product.name,
          productData: {
            category:    product.category,
            winScore:    product.winScore,
            activeAds:   product.totalAds,
          },
        }),
      })
      const body = await res.json()
      if (!body.success) throw new Error(body.error || 'AI analysis failed')

      const a = body.data.analysis
      setAiReport({
        profitAnalysis: {
          buyPrice:              a.buyPrice,
          sellPrice:             a.sellPrice,
          recommendedPlatform:   a.platforms?.[0]?.name || 'Daraz',
        },
        adCopy: {
          english: a.adCopyEN,
          urdu:    a.adCopyUR,
        },
        marketPotential:  a.summary,
        competitorAlert:  a.competitors
          ? `${a.competitors} active sellers currently competing in Pakistan for this product`
          : null,
        suppliers:        a.suppliers    || [],
        international:    a.international || null,
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

  const adWinners  = adsData?.products || []
  const displayed  = adWinners.slice(0, page * PER_PAGE)
  const hasMore    = adWinners.length > displayed.length

  const aiModalProduct = aiProduct
    ? {
        ...aiProduct,
        priceMin:        aiReport?.profitAnalysis?.buyPrice  || 0,
        priceMax:        aiReport?.profitAnalysis?.sellPrice || 0,
        competitorCount: aiProduct.advertiserCount || 0,
      }
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Winning Products</h1>
        <p className="section-subtitle">
          Products detected from live Facebook Ad Library — scored by advertiser diversity, ad volume, longevity and spend signals
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Filter by city:</span>
          <CityDropdown
            value={selectedCity}
            onChange={handleCityChange}
            cityCoverage={adsData?.cityCoverage}
          />
          {selectedCity && (
            <button
              onClick={() => handleCityChange('')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {!isLoading && (
          <p className="text-sm text-gray-500">
            <span className="text-white font-medium">{adWinners.length}</span>{' '}
            {selectedCity ? `categories in ${selectedCity}` : 'winning categories'}
          </p>
        )}
      </div>

      {/* Stats banner */}
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
                <div className="w-9 h-9 bg-white/5 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-1.5" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
                <div className="w-9 h-6 bg-white/5 rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[0, 1, 2].map((j) => <div key={j} className="h-14 bg-white/5 rounded-lg" />)}
              </div>
              <div className="h-8 bg-white/5 rounded-lg" />
              <div className="mt-auto h-8 bg-white/5 rounded-lg mt-3" />
            </div>
          ))}
        </div>
      ) : adWinners.length === 0 ? (
        <EmptyState city={selectedCity} onScrape={triggerScrape} scraping={scraping} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map((p) => (
              <AdWinnerCard
                key={p.id}
                product={p}
                onViewScore={handleViewScore}
                onViewAI={handleViewAI}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage((n) => n + 1)}
                className="btn-secondary px-8"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* AI loading overlay */}
      {aiLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 flex flex-col items-center gap-4 max-w-xs text-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            <p className="text-white font-medium">Generating AI Report</p>
            <p className="text-gray-500 text-sm">Analyzing {aiProduct?.name} for Pakistan market...</p>
          </div>
        </div>
      )}

      {/* Score Breakdown Modal */}
      {scoreProduct && (
        <AdScoreBreakdownModal
          product={scoreProduct}
          onClose={() => setScoreProduct(null)}
        />
      )}

      {/* AI Report Modal */}
      {aiProduct && aiReport && !aiLoading && (
        <AIReportModal
          product={aiModalProduct}
          report={aiReport}
          onClose={() => { setAiProduct(null); setAiReport(null) }}
        />
      )}
    </div>
  )
}
