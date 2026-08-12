import { useState } from 'react'
import {
  FiAlertTriangle, FiCheck, FiPackage, FiDollarSign,
  FiBarChart2, FiChevronDown, FiChevronUp, FiTarget, FiExternalLink,
  FiRefreshCw, FiCpu,
} from 'react-icons/fi'
import { identifyWinningProduct, getSourcingAdvice } from '../lib/api.js'

// Normalize both response shapes (raw mongoose subdoc / identify route shape)
function normalize(ip) {
  if (!ip) return null
  const status = ip.status || ip.identificationStatus
  if (status !== 'identified' && status !== 'low_confidence') return null
  return {
    name:        ip.name || null,
    category:    ip.category || null,
    keyFeatures: ip.keyFeatures || [],
    confidence:  ip.confidence ?? null,
    status,
    productSlug: ip.productSlug || null,
    source:      ip.source || null,
  }
}

const COMPETITION_CLS = {
  Low:    'text-green-400 bg-green-500/10 border-green-500/25',
  Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  High:   'text-red-400 bg-red-500/10 border-red-500/25',
}

function AdviceRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="mt-0.5 text-gray-500 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
        <div className="text-xs text-gray-200">{children}</div>
      </div>
    </div>
  )
}

// ── Premium state panels — inline, calm, never an alarming popup ─────────

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/25">
          <FiCpu size={14} className="text-purple-300 animate-pulse" />
          <span className="absolute inset-0 rounded-lg bg-purple-400/10 animate-ping" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-purple-200 font-body">Our AI is studying this product's top ads…</p>
          <p className="text-[10px] text-gray-500 font-body mt-0.5">Usually takes a few seconds</p>
        </div>
      </div>
      <div className="mt-2.5 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-purple-400/40 animate-[shimmer_1.4s_ease-in-out_infinite]" style={{ animation: 'shimmer 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

function GentleRetryPanel({ onRetry, busy }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-3.5 space-y-2.5">
      <div className="flex items-start">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-300 font-body">Not quite ready to identify yet</p>
          <p className="text-[11px] text-gray-500 font-body leading-relaxed mt-0.5">
            This product's newest ads are still being enriched with usable visuals — fresh data lands with
            every scrape. A quick retry often does the trick.
          </p>
        </div>
      </div>
      <button
        onClick={onRetry}
        disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 hover:bg-white/5 transition-all disabled:opacity-50"
      >
        <FiRefreshCw size={11} className={busy ? 'animate-spin' : ''} />
        Try again
      </button>
    </div>
  )
}

// Product Hunt (winning products) cards show aggregates, not one ad — this
// button asks the backend to identify the product from its best representative
// ad (longest-running, with image — falling back to ad-copy estimation).
export default function WinnerIdentifier({ productName, category }) {
  const [identified, setIdentified]   = useState(null)
  const [repAd, setRepAd]             = useState(null)
  const [identifying, setIdentifying] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [advice, setAdvice]           = useState(null)
  const [adviceBusy, setAdviceBusy]   = useState(false)
  const [adviceOpen, setAdviceOpen]   = useState(false)
  const [adviceErr, setAdviceErr]     = useState(false)

  const handleIdentify = async () => {
    setIdentifying(true)
    setUnavailable(false)
    try {
      const res = await identifyWinningProduct({ productName, category })
      const ip  = normalize(res.identifiedProduct)
      if (ip) setIdentified(ip)
      else setUnavailable(true) // failed/low-quality outcome → gentle retry panel
      if (res.representativeAd) setRepAd(res.representativeAd)
    } catch {
      setUnavailable(true) // network/server hiccup — same calm retry path
    } finally {
      setIdentifying(false)
    }
  }

  const handleAdvice = async () => {
    if (!identified?.productSlug) return
    setAdviceBusy(true)
    setAdviceErr(false)
    try {
      const res = await getSourcingAdvice(identified.productSlug)
      setAdvice(res.sourcingAdvice)
      setAdviceOpen(true)
    } catch {
      setAdviceErr(true)
    } finally {
      setAdviceBusy(false)
    }
  }

  // ── Trigger button ─────────────────────────────────────────────────────────
  if (!identified) {
    if (identifying) return <LoadingPanel />
    if (unavailable) return <GentleRetryPanel onRetry={handleIdentify} busy={identifying} />
    return (
      <button
        onClick={handleIdentify}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all"
      >
        Identify Exact Product
      </button>
    )
  }

  // ── Identified / low-confidence result ─────────────────────────────────────
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">Identified product</p>
          <p className="text-sm font-semibold text-white leading-tight">{identified.name}</p>
        </div>
        {identified.confidence !== null && (
          <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400">
            {identified.confidence}% sure
          </span>
        )}
      </div>

      {identified.source === 'text' ? (
        <div className="flex items-start gap-1.5 text-amber-300/90 text-[11px] bg-amber-500/8 border border-amber-500/20 rounded-lg px-2 py-1.5">
          <FiAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          Estimated from ad copy — no product image available yet
        </div>
      ) : identified.status === 'low_confidence' ? (
        <div className="flex items-start gap-1.5 text-yellow-400/90 text-[11px] bg-yellow-500/8 border border-yellow-500/20 rounded-lg px-2 py-1.5">
          <FiAlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          AI-estimated — verify manually before sourcing
        </div>
      ) : null}

      {identified.category && (
        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full border border-purple-500/25 bg-purple-500/10 text-purple-300">
          {identified.category}
        </span>
      )}

      {identified.keyFeatures.length > 0 && (
        <ul className="space-y-1">
          {identified.keyFeatures.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-gray-300">
              <FiCheck size={11} className="text-green-400 mt-0.5 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* Which ad the AI actually analysed — full transparency */}
      {repAd && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          {repAd.imageUrl && (
            <img
              src={repAd.imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-600">Identified from</p>
            <p className="text-[11px] text-gray-400 truncate">
              {repAd.advertiserName || 'Top advertiser'}
              {repAd.daysRunning ? ` · ${repAd.daysRunning}d running` : ''}
            </p>
          </div>
          {repAd.directUrl && (
            <a
              href={repAd.directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              title="View source ad on Facebook"
            >
              <FiExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {identified.status === 'identified' && identified.productSlug && (
        <button
          onClick={advice ? () => setAdviceOpen((o) => !o) : handleAdvice}
          disabled={adviceBusy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all disabled:opacity-60 disabled:cursor-wait"
        >
          {adviceBusy ? 'Generating advice…' : (
            <>
              Get Sourcing Advice
              {advice && (adviceOpen ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
            </>
          )}
        </button>
      )}

      {adviceErr && (
        <button
          onClick={handleAdvice}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] border border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
        >
          <FiRefreshCw size={11} />
          Advice didn't load — tap to retry
        </button>
      )}

      {/* ── Sourcing advice (expandable) ─────────────────────────────────── */}
      {advice && adviceOpen && (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 mt-1">
          <p className="text-xs text-gray-300 leading-relaxed pb-2 border-b border-white/5">{advice.summary}</p>
          <AdviceRow icon={<FiPackage size={12} />} label="Test stock size">
            {advice.recommendedStockSize || '—'}
          </AdviceRow>
          <AdviceRow icon={<FiDollarSign size={12} />} label="Suggested price">
            {advice.suggestedPricePoint || '—'}
          </AdviceRow>
          <AdviceRow icon={<FiBarChart2 size={12} />} label="Competition">
            {advice.competitionLevel ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${COMPETITION_CLS[advice.competitionLevel]}`}>
                {advice.competitionLevel}
              </span>
            ) : '—'}
          </AdviceRow>
          <AdviceRow icon={<FiTarget size={12} />} label="Ad angle">
            {advice.suggestedAdAngle || '—'}
          </AdviceRow>
        </div>
      )}
    </div>
  )
}
