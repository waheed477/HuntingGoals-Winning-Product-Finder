import { FiTrendingUp } from 'react-icons/fi'

const SIGNALS = [
  {
    key: 'daraz',
    label: 'Daraz Sales',
    icon: '🛍️',
    color: 'from-orange-500 to-orange-400',
    normalize: (p) => Math.min(Math.round((p.darazOrders || 0) / 10), 100),
    hint: (p) => `${p.darazOrders || 0} orders`,
  },
  {
    key: 'google',
    label: 'Google Trends',
    icon: '📈',
    color: 'from-blue-500 to-blue-400',
    normalize: (p) => Math.min(p.googleTrendSpike || 0, 100),
    hint: (p) => `+${p.googleTrendSpike || 0}% spike`,
  },
  {
    key: 'fbads',
    label: 'Facebook Ads',
    icon: '📘',
    color: 'from-indigo-500 to-indigo-400',
    normalize: (p) => Math.min((p.activeAds || 0) * 2, 100),
    hint: (p) => `${p.activeAds || 0} active ads`,
  },
  {
    key: 'tiktok',
    label: 'TikTok Views',
    icon: '🎵',
    color: 'from-pink-500 to-pink-400',
    normalize: (p) => Math.min(Math.round((p.tiktokViews || 0) / 1000), 100),
    hint: (p) => `${(p.tiktokViews || 0).toLocaleString()} views`,
  },
  {
    key: 'olx',
    label: 'OLX Demand',
    icon: '🏷️',
    color: 'from-teal-500 to-teal-400',
    normalize: (p) => Math.min(Math.round((p.olxViews || 0) / 50), 100),
    hint: (p) => `${(p.olxViews || 0).toLocaleString()} views`,
  },
  {
    key: 'alibaba',
    label: 'Alibaba Surge',
    icon: '🏭',
    color: 'from-yellow-500 to-yellow-400',
    normalize: (p) => Math.min(p.alibabaOrderSurge || 0, 100),
    hint: (p) => `+${p.alibabaOrderSurge || 0}% surge`,
  },
  {
    key: 'seasonal',
    label: 'Seasonal Fit',
    icon: '📅',
    color: 'from-green-500 to-green-400',
    normalize: (p) => Math.min(p.seasonalRelevance || 0, 100),
    hint: (p) => `${p.seasonalRelevance || 0}/100`,
  },
]

function ScoreBar({ score, color }) {
  return (
    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

export default function ScoreBreakdown({ product }) {
  if (!product) return null

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <FiTrendingUp className="text-primary-400" size={16} />
        <span className="text-sm font-medium text-gray-300">Win Score Breakdown</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-2xl font-bold text-white">{product.winScore || 0}</span>
          <span className="text-gray-500 text-sm">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {SIGNALS.map((signal) => {
          const score = signal.normalize(product)
          return (
            <div key={signal.key} className="flex items-center gap-3">
              <span className="text-base w-5 flex-shrink-0">{signal.icon}</span>
              <span className="text-xs text-gray-400 w-24 flex-shrink-0">{signal.label}</span>
              <ScoreBar score={score} color={signal.color} />
              <span className="text-xs text-gray-500 w-20 text-right flex-shrink-0">
                {signal.hint(product)}
              </span>
              <span className={`text-xs font-bold w-8 text-right flex-shrink-0 ${
                score >= 75 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-gray-600'
              }`}>
                {score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
