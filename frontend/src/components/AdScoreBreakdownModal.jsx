import { FiX, FiTrendingUp, FiUsers, FiClock, FiDollarSign } from 'react-icons/fi'

const SCORE_SIGNALS = [
  {
    key: 'diversity',
    label: 'Advertiser Diversity',
    icon: <FiUsers size={14} className="text-blue-400" />,
    color: 'from-blue-500 to-blue-400',
    maxPts: 40,
    compute: (p) => Math.min(40, (p.advertiserCount || 0) * 8),
    hint: (p) => `${p.advertiserCount || 0} unique sellers`,
    description: 'How many different advertisers are running ads — more sellers = proven demand',
  },
  {
    key: 'volume',
    label: 'Ad Volume',
    icon: <FiTrendingUp size={14} className="text-indigo-400" />,
    color: 'from-indigo-500 to-indigo-400',
    maxPts: 30,
    compute: (p) => Math.min(30, Math.round((p.totalAds || 0) / 2)),
    hint: (p) => `${p.totalAds || 0} active ads`,
    description: 'Total number of active ads in the last 7 days across Facebook Ad Library',
  },
  {
    key: 'longevity',
    label: 'Ad Longevity',
    icon: <FiClock size={14} className="text-green-400" />,
    color: 'from-green-500 to-green-400',
    maxPts: 20,
    compute: (p) => {
      const d = p.maxDaysRunning || 0
      return d >= 30 ? 20 : d >= 14 ? 10 : d >= 7 ? 5 : 0
    },
    hint: (p) => `${p.maxDaysRunning || 0} days max`,
    description: 'Longest-running ad duration — ads running 30+ days are proven profitable',
  },
  {
    key: 'spend',
    label: 'High-Spend Signal',
    icon: <FiDollarSign size={14} className="text-orange-400" />,
    color: 'from-orange-500 to-orange-400',
    maxPts: 10,
    compute: (p) => Math.min(10, (p.highSpendAds || 0) * 2),
    hint: (p) => `${p.highSpendAds || 0} high-spend ads`,
    description: 'Ads flagged as high-spend indicate advertisers are scaling profitably',
  },
]

function ScoreBar({ score, maxPts, color }) {
  const pct = maxPts > 0 ? (score / maxPts) * 100 : 0
  return (
    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function AdScoreBreakdownModal({ product, onClose }) {
  if (!product) return null

  const totalScore = SCORE_SIGNALS.reduce((sum, s) => sum + s.compute(product), 0)

  const scoreColor =
    totalScore >= 75 ? 'text-green-400' :
    totalScore >= 60 ? 'text-yellow-400' :
    totalScore >= 40 ? 'text-orange-400' : 'text-red-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg glass-card p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FiTrendingUp size={14} className="text-primary-400" />
              <span className="text-primary-400 text-xs font-medium uppercase tracking-wider">Score Breakdown</span>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">{product.name}</h2>
            <span className="text-xs text-gray-500">{product.category} · Facebook Ads Signal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-3xl font-black ${scoreColor}`}>{product.winScore}</div>
              <div className="text-xs text-gray-500">/ 100</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Scoring explanation */}
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Win Score is calculated from 4 Facebook Ad Library signals — each measures a different
          dimension of market validation.
        </p>

        {/* Signals */}
        <div className="space-y-4">
          {SCORE_SIGNALS.map((signal) => {
            const pts = signal.compute(product)
            const pctOfMax = signal.maxPts > 0 ? Math.round((pts / signal.maxPts) * 100) : 0
            return (
              <div key={signal.key}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-5 flex-shrink-0 flex justify-center">{signal.icon}</div>
                  <span className="text-xs text-gray-300 font-medium flex-1">{signal.label}</span>
                  <span className="text-xs text-gray-500">{signal.hint(product)}</span>
                  <span className={`text-xs font-bold w-14 text-right flex-shrink-0 ${
                    pctOfMax >= 75 ? 'text-green-400' :
                    pctOfMax >= 40 ? 'text-yellow-400' : 'text-gray-500'
                  }`}>
                    {pts} / {signal.maxPts} pts
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-8">
                  <ScoreBar score={pts} maxPts={signal.maxPts} color={signal.color} />
                </div>
                <p className="text-[10px] text-gray-600 pl-8 mt-1">{signal.description}</p>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-gray-400">Total Win Score</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
                  totalScore >= 75 ? 'from-green-500 to-emerald-400' :
                  totalScore >= 60 ? 'from-yellow-500 to-amber-400' :
                  totalScore >= 40 ? 'from-orange-500 to-orange-400' : 'from-red-500 to-red-400'
                }`}
                style={{ width: `${totalScore}%` }}
              />
            </div>
            <span className={`text-xl font-black ${scoreColor}`}>{totalScore}</span>
            <span className="text-gray-500 text-sm">/ 100</span>
          </div>
        </div>

        {product.isProvenWinner && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="text-green-400 text-xs font-semibold">Proven Winner</span>
            <span className="text-[10px] text-green-600">— at least one ad has run 30+ days, indicating profitable scaling</span>
          </div>
        )}
      </div>
    </div>
  )
}
