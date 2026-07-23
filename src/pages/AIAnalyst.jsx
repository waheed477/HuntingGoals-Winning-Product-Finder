import { useState } from 'react'
import { FiSearch, FiCpu, FiDollarSign, FiTarget, FiUsers, FiStar, FiAlertTriangle, FiLock } from 'react-icons/fi'
import { formatPKR } from '../utils/formatPKR.js'
import useStore from '../store/useStore.js'
import TikTokPanel from '../components/TikTokPanel.jsx'

export default function AIAnalyst() {
  const user = useStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [buyPrice, setBuyPrice] = useState(0)
  const [sellPrice, setSellPrice] = useState(0)

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setIsLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ productName: query.trim() }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Analysis failed')
        return
      }

      const r = data.data.analysis
      setReport({ ...r, product: data.data.productName })
      setBuyPrice(r.buyPrice || 0)
      setSellPrice(r.sellPrice || 0)
    } catch (err) {
      setError('Failed to connect to AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const margin = sellPrice > 0 ? Math.round(((sellPrice - buyPrice) / sellPrice) * 100) : 0

  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="section-title">AI Analyst</h1>
          <p className="section-subtitle">Get deep AI-powered analysis for any product</p>
        </div>
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiLock className="text-primary-400" size={28} />
          </div>
          <h3 className="text-white font-semibold mb-2">Login Required</h3>
          <p className="text-gray-500 text-sm">Sign in to access AI-powered product analysis.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">AI Analyst</h1>
        <p className="section-subtitle">Get deep AI-powered analysis for any product</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "electric heater", "smart watch", "skin serum"...'
            className="input-field pl-12 py-3.5"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn-primary px-6 py-3.5 flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <FiCpu size={16} />
              Analyze
            </>
          )}
        </button>
      </form>

      {isLoading && (
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium mb-1">Analyzing product...</p>
          <p className="text-gray-500 text-sm">Scanning Daraz, OLX & TikTok · Running AI model</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="glass-card p-5 flex items-start gap-3 border-red-500/20 bg-red-500/5">
          <FiAlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-white mb-1">Analysis Unavailable</p>
            <p className="text-xs text-gray-400">{error}</p>
            {error.includes('GROQ_API_KEY') && (
              <p className="text-xs text-gray-500 mt-1">
                Configure GROQ_API_KEY in the backend environment to enable AI analysis.
              </p>
            )}
          </div>
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
              <FiCpu className="text-primary-400" size={22} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{report.product}</h2>
              <p className="text-sm text-gray-400">{report.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">{report.score}</p>
              <p className="text-xs text-gray-500">Win Score</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiDollarSign className="text-green-400" size={16} />
                <h3 className="text-sm font-semibold text-white">Profit Calculator</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Buy Price (PKR)</label>
                  <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(Number(e.target.value))} className="input-field text-sm py-2" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sell Price (PKR)</label>
                  <input type="number" value={sellPrice} onChange={(e) => setSellPrice(Number(e.target.value))} className="input-field text-sm py-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Profit/unit</p>
                    <p className="text-green-400 font-bold text-lg">{formatPKR(sellPrice - buyPrice)}</p>
                  </div>
                  <div className={`border rounded-xl p-3 text-center ${margin >= 30 ? 'bg-green-500/10 border-green-500/20' : margin >= 15 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <p className="text-xs text-gray-400 mb-1">Margin</p>
                    <p className={`font-bold text-lg ${margin >= 30 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>{margin}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiTarget className="text-primary-400" size={16} />
                <h3 className="text-sm font-semibold text-white">Platform Recommendation</h3>
              </div>
              <div className="space-y-3">
                {(report.platforms || []).map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{p.name}</span>
                      <span className="text-xs text-gray-400">{p.score}% match</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${p.score}%`,
                          background: i === 0 ? '#6366f1' : i === 1 ? '#f97316' : '#3b82f6',
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{p.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(report.adCopyEN || report.adCopyUR) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FiStar className="text-yellow-400" size={16} />
                <h3 className="text-sm font-semibold text-white">Ad Copy Suggestions</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {report.adCopyEN && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-2">English</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{report.adCopyEN}</p>
                  </div>
                )}
                {report.adCopyUR && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-accent-400 font-medium uppercase tracking-wider mb-2">Urdu</p>
                    <p className="text-sm text-gray-200 leading-relaxed" dir="rtl">{report.adCopyUR}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {report.competitors != null && (
            <div className={`glass-card p-4 flex items-center gap-3 ${report.competitors > 20 ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
              <FiUsers className={report.competitors > 20 ? 'text-red-400' : 'text-yellow-400'} size={20} />
              <div>
                <p className="text-sm font-medium text-white">{report.competitors} active competitors selling this product</p>
                <p className="text-xs text-gray-400">
                  {report.competitors > 30
                    ? 'Very high competition — differentiate strongly on price, speed, or quality'
                    : report.competitors > 15
                    ? 'Moderate competition — focus on ad creative and customer reviews'
                    : 'Low competition — great opportunity to establish market position'}
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-pink-400">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z" />
              </svg>
              TikTok Trends
            </h3>
            <TikTokPanel productName={report.product} />
          </div>
        </div>
      )}

      {!report && !isLoading && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiCpu className="text-primary-400" size={28} />
          </div>
          <h3 className="text-white font-semibold mb-2">AI Product Analyst</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Search for any product to get an AI-generated report with profit calculator, platform recommendations, and ad copy.
          </p>
        </div>
      )}
    </div>
  )
}
