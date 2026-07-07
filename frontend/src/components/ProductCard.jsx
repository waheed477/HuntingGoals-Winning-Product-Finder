import { useState } from 'react'
import { FiTrendingUp, FiTrendingDown, FiExternalLink, FiBarChart2 } from 'react-icons/fi'
import WinScoreBadge from './WinScoreBadge.jsx'
import AIReportModal from './AIReportModal.jsx'
import WinScoreDetails from './WinScoreDetails.jsx'
import { formatPriceRange } from '../utils/formatPKR.js'

const PLATFORM_COLORS = {
  Daraz: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  OLX: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TikTok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export default function ProductCard({ product }) {
  const [showModal,        setShowModal]        = useState(false)
  const [showScoreDetails, setShowScoreDetails] = useState(false)
  const [imgError,         setImgError]         = useState(false)

  return (
    <>
      <div className="glass-card-hover card-shine p-4 flex flex-col h-full group">
        <div className="relative mb-3">
          <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-800">
            {!imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900/50 to-gray-900">
                <span className="text-4xl">📦</span>
              </div>
            )}
          </div>
          <div className="absolute top-2 left-2">
            <WinScoreBadge score={product.winScore} size="sm" />
          </div>
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            <span
              title="Trend based on verified Google Trends Pakistan data"
              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                product.trend === 'up'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {product.trend === 'up' ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
              {Math.abs(product.trendPct)}%
            </span>
            <span className="text-[9px] text-blue-400/70 font-medium px-1">Google Verified</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm leading-tight mb-1.5 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-primary-400 text-xs font-medium mb-3">
            {formatPriceRange(product.priceMin, product.priceMax)}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.platforms.map((p) => (
              <span
                key={p}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLATFORM_COLORS[p] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
              >
                {p}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            <span title="Estimated — FB Ads Library requires login to verify">{product.adsRunning} ads est.</span>
            <span>·</span>
            <span title="Estimated — based on category research">{product.competitors} competitors</span>
          </div>

          {product.verificationNote && (
            <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg mb-2">
              {product.verificationNote}
            </div>
          )}
          {product.seasonalWarning && (
            <div className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg mb-2">
              {product.seasonalWarning}
            </div>
          )}
          {product.confidence === 'low' && (
            <div className="text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 px-2 py-1 rounded-lg mb-2">
              Low confidence — verify before sourcing
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-auto flex gap-2 pt-1">
          <button
            onClick={() => setShowScoreDetails(true)}
            className="flex-1 py-2 text-sm font-medium text-gray-400 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5"
            title="See how this Win Score was calculated"
          >
            <FiBarChart2 size={13} />
            Score
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 py-2 text-sm font-medium text-primary-400 border border-primary-500/30 rounded-xl hover:bg-primary-500/10 hover:border-primary-500/60 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <FiExternalLink size={13} />
            AI Report
          </button>
        </div>
      </div>

      {showModal && <AIReportModal product={product} onClose={() => setShowModal(false)} />}
      {showScoreDetails && (
        <WinScoreDetails product={product} onClose={() => setShowScoreDetails(false)} />
      )}
    </>
  )
}
