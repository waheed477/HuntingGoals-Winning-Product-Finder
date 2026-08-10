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
    <div className="glass-card card-3d-hover p-5 flex flex-col gap-3 h-full">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center border ${catStyle.bg} ${catStyle.border}`}>
            <FiBarChart2 size={15} className={catStyle.text} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold leading-tight line-clamp-1" style={{ color: 'var(--color-bone)' }}>
              {product.name}
            </h3>
            <span className={`font-mono-label inline-block text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full mt-0.5 ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
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
        {[
          { icon: <FiUsers size={10} style={{ color: 'var(--color-moss)' }} />, value: product.advertiserCount, label: 'advertisers' },
          { icon: <FiTrendingUp size={10} style={{ color: 'var(--color-moss)' }} />, value: product.totalAds, label: 'active ads' },
          { icon: <FiClock size={10} style={{ color: 'var(--color-moss)' }} />, value: `${product.maxDaysRunning}d`, label: 'max running', highlight: product.maxDaysRunning >= 30 },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-ink-4)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">{stat.icon}</div>
            <p className={`text-sm font-bold ${stat.highlight ? 'text-green-400' : ''}`} style={!stat.highlight ? { color: 'var(--color-bone)' } : {}}>
              {stat.value}
            </p>
            <p className="font-mono-label text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--color-moss)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Proven winner badge */}
      {product.isProvenWinner && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/8 border border-green-500/20 rounded-lg">
          <span className="text-green-400 text-xs font-semibold font-body">Proven Winner</span>
          <span className="text-[10px] text-green-600 font-body">— ads running 30+ days</span>
        </div>
      )}

      {/* High spend signal */}
      {product.highSpendAds > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/8 border border-orange-500/20 rounded-lg">
          <span className="text-orange-400 text-xs font-semibold font-body">{product.highSpendAds} high-spend</span>
          <span className="text-[10px] text-orange-600 font-body">ads — profitable signal</span>
        </div>
      )}

      {/* Top advertisers */}
      {product.topAdvertisers?.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono-label text-[9px] uppercase tracking-[0.15em]" style={{ color: 'var(--color-moss)' }}>Top Advertisers</p>
          {product.topAdvertisers.map((adv, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-xs font-body truncate" style={{ color: 'var(--color-smoke)' }}>{adv.name || 'Unknown'}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono-label text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--color-moss)' }}>{adv.adCount} ads · {adv.maxDays}d</span>
                {adv.sampleUrl && (
                  <a
                    href={adv.sampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{ color: 'var(--color-acid)' }}
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
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all border font-body"
          style={{ color: 'var(--color-smoke)', borderColor: 'var(--color-ink-4)', backgroundColor: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-ink-3)'; e.currentTarget.style.color = 'var(--color-bone)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-smoke)' }}
        >
          <FiBarChart2 size={12} />
          Score Breakdown
        </button>
        <button
          onClick={() => onViewAI && onViewAI(product)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all border btn-shine font-body"
          style={{ color: 'var(--color-acid)', borderColor: 'var(--color-acid)', backgroundColor: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-acid)'; e.currentTarget.style.color = 'var(--color-ink)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-acid)' }}
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
          className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-body transition-colors"
          style={{ color: 'var(--color-moss)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-smoke)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-moss)'}
        >
          <FiExternalLink size={10} />
          View on Facebook Ad Library
        </a>
      )}
    </div>
  )
}
