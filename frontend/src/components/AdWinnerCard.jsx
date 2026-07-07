import { FiExternalLink, FiUsers, FiTrendingUp, FiClock, FiBarChart2, FiZap } from 'react-icons/fi'

const CATEGORY_COLORS = {
  Electronics:    { bg: 'bg-blue-500/15',   border: 'border-blue-500/25',   text: 'text-blue-400'   },
  Fashion:        { bg: 'bg-pink-500/15',   border: 'border-pink-500/25',   text: 'text-pink-400'   },
  Beauty:         { bg: 'bg-purple-500/15', border: 'border-purple-500/25', text: 'text-purple-400' },
  'Home & Garden':{ bg: 'bg-teal-500/15',   border: 'border-teal-500/25',   text: 'text-teal-400'   },
  Home:           { bg: 'bg-teal-500/15',   border: 'border-teal-500/25',   text: 'text-teal-400'   },
  Sports:         { bg: 'bg-green-500/15',  border: 'border-green-500/25',  text: 'text-green-400'  },
  Grocery:        { bg: 'bg-yellow-500/15', border: 'border-yellow-500/25', text: 'text-yellow-400' },
  Toys:           { bg: 'bg-orange-500/15', border: 'border-orange-500/25', text: 'text-orange-400' },
}

const SCORE_CLS = (s) =>
  s >= 75 ? 'text-green-400 bg-green-500/10 border-green-500/25'  :
  s >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' :
  s >= 40 ? 'text-orange-400 bg-orange-500/10 border-orange-500/25' :
            'text-red-400 bg-red-500/10 border-red-500/25'

export default function AdWinnerCard({ product, onViewScore, onViewAI }) {
  const catStyle = CATEGORY_COLORS[product.category] || CATEGORY_COLORS['Electronics']

  return (
    <div className="glass-card-hover p-5 flex flex-col gap-3 h-full">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center border ${catStyle.bg} ${catStyle.border}`}>
            <FiBarChart2 size={15} className={catStyle.text} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white leading-tight line-clamp-1">
              {product.name}
            </h3>
            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
              {product.category}
            </span>
          </div>
        </div>
        <span className={`flex-shrink-0 text-sm font-bold px-2 py-0.5 rounded-lg border ${SCORE_CLS(product.winScore)}`}>
          {product.winScore}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FiUsers size={10} className="text-gray-500" />
          </div>
          <p className="text-sm font-bold text-white">{product.advertiserCount}</p>
          <p className="text-[10px] text-gray-600">advertisers</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FiTrendingUp size={10} className="text-gray-500" />
          </div>
          <p className="text-sm font-bold text-white">{product.totalAds}</p>
          <p className="text-[10px] text-gray-600">active ads</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <FiClock size={10} className="text-gray-500" />
          </div>
          <p className={`text-sm font-bold ${product.maxDaysRunning >= 30 ? 'text-green-400' : 'text-white'}`}>
            {product.maxDaysRunning}d
          </p>
          <p className="text-[10px] text-gray-600">max running</p>
        </div>
      </div>

      {/* Proven winner badge */}
      {product.isProvenWinner && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/8 border border-green-500/20 rounded-lg">
          <span className="text-green-400 text-xs font-semibold">Proven Winner</span>
          <span className="text-[10px] text-green-600">— ads running 30+ days</span>
        </div>
      )}

      {/* High spend signal */}
      {product.highSpendAds > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/8 border border-orange-500/20 rounded-lg">
          <span className="text-orange-400 text-xs font-semibold">{product.highSpendAds} high-spend</span>
          <span className="text-[10px] text-orange-600">ads — profitable signal</span>
        </div>
      )}

      {/* Top advertisers */}
      {product.topAdvertisers?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Top Advertisers</p>
          {product.topAdvertisers.map((adv, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 truncate">{adv.name || 'Unknown'}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-gray-600">{adv.adCount} ads · {adv.maxDays}d</span>
                {adv.sampleUrl && (
                  <a
                    href={adv.sampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                    title="View ad on Facebook"
                  >
                    <FiExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto flex gap-2 pt-1">
        <button
          onClick={() => onViewScore && onViewScore(product)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all"
        >
          <FiBarChart2 size={12} />
          Score Breakdown
        </button>
        <button
          onClick={() => onViewAI && onViewAI(product)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary-300 border border-primary-500/30 rounded-xl hover:bg-primary-500/10 hover:border-primary-500/60 transition-all"
        >
          <FiZap size={12} />
          AI Report
        </button>
      </div>

      {/* FB Ad Library link */}
      {product.sampleUrl && (
        <a
          href={product.sampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          <FiExternalLink size={10} />
          View on Facebook Ad Library
        </a>
      )}
    </div>
  )
}
