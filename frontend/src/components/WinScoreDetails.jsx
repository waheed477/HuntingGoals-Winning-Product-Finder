import { useEffect, useState, useCallback } from 'react'
import { FiX, FiTrendingUp, FiTrendingDown, FiMinus, FiPhone, FiGlobe, FiMapPin, FiCheckCircle, FiPackage } from 'react-icons/fi'
import useStore from '../store/useStore.js'

// ── Signal config ─────────────────────────────────────────────────────────────

const SIGNAL_META = {
  daraz:    { label: 'Daraz Sales',    bar: 'bg-orange-500', text: 'text-orange-400'  },
  olx:      { label: 'OLX Demand',    bar: 'bg-teal-500',   text: 'text-teal-400'    },
  tiktok:   { label: 'TikTok Reach',  bar: 'bg-pink-500',   text: 'text-pink-400'    },
  google:   { label: 'Google Trends', bar: 'bg-blue-500',   text: 'text-blue-400'    },
  seasonal: { label: 'Seasonal Fit',  bar: 'bg-green-500',  text: 'text-green-400'   },
}

const EXTRA_META = {
  facebookAds: { label: 'Facebook Ads',  dot: 'bg-indigo-400' },
  alibaba:     { label: 'Alibaba Surge', dot: 'bg-yellow-400' },
}

const ICON_MAP = {
  daraz:    '🛍️',
  olx:      '🏷️',
  tiktok:   '🎵',
  google:   '📈',
  seasonal: '📅',
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

function ScoreGauge({ score }) {
  const R      = 52
  const C      = 2 * Math.PI * R
  const arcLen = C * 0.75
  const gapLen = C - arcLen
  const fillLen  = arcLen * (score / 100)
  const emptyLen = arcLen - fillLen

  const color =
    score >= 75 ? '#22c55e' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[135deg]">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="10" strokeDasharray={`${arcLen} ${gapLen}`} strokeLinecap="round" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={color}
          strokeWidth="10"
          strokeDasharray={`${fillLen} ${emptyLen + gapLen}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white leading-none">{score}</span>
        <span className="text-xs text-gray-500 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({ sigKey, item }) {
  const meta = SIGNAL_META[sigKey] || {}
  return (
    <div className="flex items-start gap-3">
      <span className="w-5 text-base flex-shrink-0 mt-0.5">{ICON_MAP[sigKey]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <span className="text-xs font-medium text-gray-300">{meta.label}</span>
          <span className={`text-xs font-bold flex-shrink-0 ${meta.text}`}>
            {item.pts}<span className="text-gray-600 font-normal">/{item.weight}</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full ${meta.bar} rounded-full transition-all duration-700`}
            style={{ width: `${item.score}%` }} />
        </div>
        <p className="text-[11px] text-gray-600 mt-1 truncate">{item.source}</p>
      </div>
    </div>
  )
}

// ── Supplier card ─────────────────────────────────────────────────────────────

function SupplierCard({ supplier }) {
  const isVerified = supplier.verificationStatus === 'verified' || supplier.verified

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{supplier.name}</span>
            {isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">
                <FiCheckCircle size={9} />
                Verified
              </span>
            )}
          </div>
          {supplier.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <FiMapPin size={10} className="text-gray-600" />
              <span className="text-[11px] text-gray-600">{supplier.city}</span>
            </div>
          )}
        </div>
        {supplier.rating > 0 && (
          <div className="flex-shrink-0 text-xs font-bold text-yellow-400">
            ★ {supplier.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {supplier.phone && (
          <a
            href={`tel:${supplier.phone}`}
            className="flex items-center gap-2 text-xs text-primary-400 hover:text-primary-300 transition-colors group"
          >
            <FiPhone size={11} className="flex-shrink-0" />
            <span className="group-hover:underline">{supplier.phone}</span>
          </a>
        )}
        {supplier.website && (
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary-400 hover:text-primary-300 transition-colors group"
          >
            <FiGlobe size={11} className="flex-shrink-0" />
            <span className="group-hover:underline truncate">{supplier.website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {supplier.address && (
          <p className="flex items-start gap-2 text-[11px] text-gray-600">
            <FiMapPin size={10} className="flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">{supplier.address}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WinScoreDetails({ product, onClose }) {
  const token = useStore((s) => s.user?.token)

  const [data,             setData]             = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [suppliers,        setSuppliers]        = useState([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [fallbackMsg,      setFallbackMsg]      = useState(null)

  const fetchScore = useCallback(async () => {
    if (!product?.slug) { setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res    = await fetch(`/api/products/${product.slug}/score`, { headers })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to load score')
      setData(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [product?.slug, token])

  const fetchSuppliers = useCallback(async (scoreData) => {
    if (!scoreData) return
    setLoadingSuppliers(true)
    try {
      const params = new URLSearchParams({
        category:    scoreData.category    || '',
        productName: scoreData.productName || '',
      })
      // Use first city of product if available
      if (product?.cities?.length) params.set('city', product.cities[0])

      const res    = await fetch(`/api/suppliers/match?${params}`)
      const result = await res.json()
      if (result.success) {
        setSuppliers(result.suppliers || [])
        setFallbackMsg(result.fallbackMsg || null)
      }
    } catch (err) {
      console.warn('[WinScoreDetails] supplier fetch failed:', err.message)
    } finally {
      setLoadingSuppliers(false)
    }
  }, [product?.cities])

  useEffect(() => { fetchScore() }, [fetchScore])

  useEffect(() => {
    if (data) fetchSuppliers(data)
  }, [data, fetchSuppliers])

  // Close on backdrop / Escape
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const scoreLabel =
    !data ? null :
    data.totalScore >= 75 ? { text: 'Winning Product',  cls: 'text-green-400  bg-green-500/10  border-green-500/20'  } :
    data.totalScore >= 60 ? { text: 'Promising',         cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' } :
    data.totalScore >= 40 ? { text: 'Monitor Closely',   cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' } :
                            { text: 'Weak Signals',       cls: 'text-red-400    bg-red-500/10    border-red-500/20'    }

  const TrendIcon =
    data?.trend === 'rising'  ? FiTrendingUp   :
    data?.trend === 'falling' ? FiTrendingDown : FiMinus

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-lg bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/[0.07]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white leading-tight line-clamp-2">
              {product?.name || 'Win Score Breakdown'}
            </h2>
            {data && <p className="text-xs text-gray-500 mt-0.5">{data.category}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Calculating score...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-400 mb-3">{error}</p>
              <button onClick={fetchScore} className="text-xs text-primary-400 hover:underline">Try again</button>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Score gauge */}
              <div className="flex flex-col items-center gap-3 py-6 border-b border-white/[0.07]">
                <ScoreGauge score={data.totalScore} />
                <div className="text-center space-y-2">
                  <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${scoreLabel.cls}`}>
                    {scoreLabel.text}
                  </span>
                  <p className="text-xs text-gray-500 px-6 leading-relaxed">{data.recommendation}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <TrendIcon size={11} className={
                      data.trend === 'rising'  ? 'text-green-500' :
                      data.trend === 'falling' ? 'text-red-500'   : 'text-gray-500'
                    } />
                    {data.trend}
                  </span>
                  {data.competitorCount > 0 && (
                    <><span>·</span><span>{data.competitorCount} competitor ads this week</span></>
                  )}
                  {data.lastScrapedAt && (
                    <><span>·</span><span>Updated {new Date(data.lastScrapedAt).toLocaleDateString('en-PK')}</span></>
                  )}
                </div>
              </div>

              {/* Signal breakdown */}
              <div className="p-5 space-y-1 border-b border-white/[0.07]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-primary-400" size={14} />
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Score Signals</span>
                  </div>
                  <span className="text-[11px] text-gray-600">pts / weight</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(data.breakdown).map(([key, item]) => (
                    <SignalRow key={key} sigKey={key} item={item} />
                  ))}
                </div>
              </div>

              {/* Extra context */}
              {data.extras && (
                <div className="px-5 py-4 border-b border-white/[0.07]">
                  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Additional Context</p>
                  <div className="space-y-2">
                    {Object.entries(data.extras).map(([key, item]) => {
                      const meta = EXTRA_META[key] || {}
                      return (
                        <div key={key} className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                          <span className="text-xs text-gray-500 font-medium w-24 flex-shrink-0">{meta.label}</span>
                          <span className="text-xs text-gray-600 truncate">{item.source}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Sourcing Assistant ── */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FiPackage className="text-primary-400" size={14} />
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Sourcing Assistant</span>
                  <span className="text-[11px] text-gray-600 ml-1">verified suppliers</span>
                </div>

                {fallbackMsg && (
                  <p className="text-[11px] text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2 mb-3">
                    {fallbackMsg}
                  </p>
                )}

                {loadingSuppliers ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-gray-600">
                    <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                    Finding suppliers...
                  </div>
                ) : suppliers.length > 0 ? (
                  <div className="space-y-2.5">
                    {suppliers.map((s) => (
                      <SupplierCard key={s._id} supplier={s} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <p className="text-xs text-gray-600 mb-2">No suppliers found for this category yet.</p>
                    <a
                      href="/suppliers/add"
                      className="text-xs text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                    >
                      + Add a supplier you know
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-700 leading-tight">
            Score and suppliers calculated from live DB data.
          </p>
          <button
            onClick={onClose}
            className="flex-shrink-0 px-4 py-1.5 text-xs font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
