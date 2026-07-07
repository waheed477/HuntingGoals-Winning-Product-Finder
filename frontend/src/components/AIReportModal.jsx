import { useState } from 'react'
import {
  FiX, FiTrendingUp, FiDollarSign, FiTarget, FiUsers, FiStar,
  FiPhone, FiGlobe, FiShield, FiZap, FiPackage, FiLink, FiMapPin,
  FiExternalLink, FiClock, FiBarChart2,
} from 'react-icons/fi'
import { formatPKR } from '../utils/formatPKR.js'

function getInventoryAdvice(maxDaysRunning = 0, advertiserCount = 0) {
  let base = 30
  if (maxDaysRunning >= 30)     base = 100
  else if (maxDaysRunning >= 14) base = 50

  if (advertiserCount > 20) base = Math.min(Math.round(base * 1.5), 200)

  const reorder = Math.round(base * 0.2)
  return {
    recommendedOrder: `${Math.round(base)} units`,
    reorderWhen:      `${reorder} units remaining`,
    bulkDiscount:     base > 100
      ? 'Order 100+ units for ~15% bulk discount from Alibaba'
      : 'Start with a small test batch to validate demand first',
  }
}

function SpendBadge({ highSpendAds }) {
  if (highSpendAds > 0)
    return <span className="text-orange-400 font-medium">High (scaled budget detected)</span>
  return <span className="text-gray-400">Standard</span>
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-right text-gray-200">{children}</span>
    </div>
  )
}

export default function AIReportModal({ product, report, onClose }) {
  const [buyPrice, setBuyPrice] = useState(
    report?.profitAnalysis?.buyPrice
      ? parseInt(String(report.profitAnalysis.buyPrice).replace(/[^\d]/g, ''), 10) || Math.round((product.priceMin || 0) * 0.45)
      : Math.round((product.priceMin || 0) * 0.45)
  )
  const [sellPrice, setSellPrice] = useState(
    report?.profitAnalysis?.sellPrice
      ? parseInt(String(report.profitAnalysis.sellPrice).replace(/[^\d]/g, ''), 10) || (product.priceMax || 0)
      : (product.priceMax || 0)
  )

  const margin  = sellPrice > 0 ? Math.round(((sellPrice - buyPrice) / sellPrice) * 100) : 0
  const profit  = sellPrice - buyPrice

  const adCopy    = report?.adCopy    || {}
  const suppliers = report?.suppliers || []
  const intl      = report?.international || null
  const adGuide   = report?.adGuide   || null

  const topAdv      = product.topAdvertisers?.[0]
  const cityFilter  = product.cityFilter  || null
  const sampleUrl   = product.sampleUrl   || null
  const inventory   = getInventoryAdvice(product.maxDaysRunning, product.advertiserCount)

  const sourcingQuery = encodeURIComponent(product.name)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
              <span className="text-primary-400 text-xs font-medium uppercase tracking-wider">AI Analysis Report</span>
            </div>
            <h2 className="text-xl font-bold text-white">{product.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <FiX size={20} />
          </button>
        </div>

        {/* ── A: Product Summary ─────────────────────────────── */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FiBarChart2 className="text-blue-400" size={15} />
            <span className="text-sm font-medium text-gray-300">Product Summary</span>
            <span className="ml-auto text-[10px] text-gray-600 px-1.5 py-0.5 bg-blue-500/10 rounded-full">Real Ad Data</span>
          </div>
          <div className="space-y-0">
            <Row label="Product">{product.name}</Row>
            <Row label="Category">{product.category || 'N/A'}</Row>
            {cityFilter && (
              <Row label="City Filter">
                <span className="flex items-center gap-1 justify-end">
                  <FiMapPin size={10} className="text-gray-500" />
                  {cityFilter}
                </span>
              </Row>
            )}
            <Row label="Top Advertiser">
              {topAdv?.name || 'Multiple advertisers'}
            </Row>
            <Row label="Total Advertisers">{product.advertiserCount || 0} unique sellers</Row>
            <Row label="Total Active Ads">{product.totalAds || 0}</Row>
            <Row label="Longest Running">
              <span className={`flex items-center gap-1 justify-end ${(product.maxDaysRunning || 0) >= 30 ? 'text-green-400' : ''}`}>
                <FiClock size={10} />
                {product.maxDaysRunning || 0} days
                {(product.maxDaysRunning || 0) >= 30 && ' · Proven winner'}
              </span>
            </Row>
            <Row label="Spend Signal">
              <SpendBadge highSpendAds={product.highSpendAds || 0} />
            </Row>
            {sampleUrl && (
              <div className="pt-2">
                <a
                  href={sampleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <FiExternalLink size={11} />
                  View original ad on Facebook Ad Library
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── B: Sourcing Links ──────────────────────────────── */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FiLink className="text-green-400" size={15} />
            <span className="text-sm font-medium text-gray-300">Sourcing Links</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.alibaba.com/trade/search?SearchText=${sourcingQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600/20 border border-orange-500/30 hover:bg-orange-600/30 text-orange-300 text-xs font-medium rounded-xl transition-all"
            >
              <FiGlobe size={11} />
              Alibaba Wholesale
            </a>
            <a
              href={`https://www.daraz.pk/catalog/?q=${sourcingQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-xs font-medium rounded-xl transition-all"
            >
              <FiGlobe size={11} />
              Daraz.pk
            </a>
            <a
              href={`https://www.aliexpress.com/wholesale?SearchText=${sourcingQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-300 text-xs font-medium rounded-xl transition-all"
            >
              <FiGlobe size={11} />
              AliExpress
            </a>
          </div>
        </div>

        {/* ── C: Inventory Advice ────────────────────────────── */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FiPackage className="text-accent-400" size={15} />
            <span className="text-sm font-medium text-gray-300">Inventory Advice</span>
            <span className="ml-auto text-[10px] text-gray-600">based on ad longevity &amp; competitor count</span>
          </div>
          <div className="space-y-0">
            <Row label="Recommended First Order">
              <span className="text-green-400 font-semibold">{inventory.recommendedOrder}</span>
            </Row>
            <Row label="Reorder When">{inventory.reorderWhen}</Row>
            <Row label="Bulk Strategy">{inventory.bulkDiscount}</Row>
          </div>
          <div className="mt-3 text-[10px] text-gray-600 leading-relaxed">
            Based on {product.maxDaysRunning || 0} days max ad run &amp; {product.advertiserCount || 0} active advertisers
          </div>
        </div>

        {/* ── Profit Calculator + Best Platform ─────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiDollarSign className="text-green-400" size={16} />
              <span className="text-sm font-medium text-gray-300">Profit Calculator</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Buy Price (PKR)</label>
                <input
                  type="number"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(Number(e.target.value))}
                  className="input-field text-sm py-2"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sell Price (PKR)</label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="input-field text-sm py-2"
                />
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Profit/unit</span>
                  <span className="text-green-400 font-bold">{formatPKR(profit)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">Margin</span>
                  <span className={`font-bold text-sm ${margin >= 30 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {margin}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiTarget className="text-primary-400" size={16} />
              <span className="text-sm font-medium text-gray-300">Best Platform</span>
            </div>
            {/* Platforms derived from real ad data — no fake scores */}
            <div className="space-y-2">
              {(() => {
                const PLATFORM_META = {
                  facebook:  { label: 'Facebook',  color: 'text-blue-400'   },
                  instagram: { label: 'Instagram', color: 'text-pink-400'   },
                  tiktok:    { label: 'TikTok',    color: 'text-purple-400' },
                  daraz:     { label: 'Daraz',     color: 'text-orange-400' },
                  olx:       { label: 'OLX',       color: 'text-cyan-400'   },
                }
                const recommended = report?.profitAnalysis?.recommendedPlatform || null
                const raw = product.platforms?.length > 0
                  ? [...new Set([...product.platforms, 'daraz'])]
                  : ['facebook', 'daraz']
                return raw.map((key, i) => {
                  const meta = PLATFORM_META[key] || { label: key, color: 'text-gray-400' }
                  const isTop = i === 0 || meta.label === recommended
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        isTop
                          ? 'bg-green-500/15 text-green-400 border-green-500/25'
                          : 'bg-white/5 text-gray-500 border-white/10'
                      }`}>
                        {isTop ? '✓ Recommended' : 'Active'}
                      </span>
                    </div>
                  )
                })
              })()}
              <p className="text-[10px] text-gray-600 pt-1">Based on platforms detected in scraped ads</p>
            </div>
          </div>
        </div>

        {/* ── Market Potential ───────────────────────────────── */}
        {report?.marketPotential && (
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FiTrendingUp className="text-accent-400" size={16} />
              <span className="text-sm font-medium text-gray-300">Market Potential</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{report.marketPotential}</p>
          </div>
        )}

        {/* ── Ad Copy ────────────────────────────────────────── */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FiStar className="text-yellow-400" size={16} />
            <span className="text-sm font-medium text-gray-300">Ad Copy Suggestions</span>
          </div>
          <div className="space-y-3">
            {adCopy.english ? (
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1 block">English</span>
                <p className="text-sm text-white leading-relaxed">{adCopy.english}</p>
              </div>
            ) : null}
            {adCopy.urdu ? (
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-accent-400 font-medium uppercase tracking-wider mb-1 block">Roman Urdu</span>
                <p className="text-sm text-white leading-relaxed">{adCopy.urdu}</p>
              </div>
            ) : null}
            {!adCopy.english && !adCopy.urdu && (
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">
                  No AI-generated copy available.{' '}
                  <span className="text-gray-400">Add <code className="bg-white/10 px-1 rounded text-orange-300">GROQ_API_KEY</code> to Secrets to enable real ad copy suggestions.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Competitor Alert ───────────────────────────────── */}
        {report?.competitorAlert ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
            <FiUsers className="text-red-400 flex-shrink-0" size={18} />
            <p className="text-sm text-gray-200">{report.competitorAlert}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
            <FiUsers className="text-red-400 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm font-medium text-white">{product.competitorCount || product.advertiserCount || 0} active competitors</p>
              <p className="text-xs text-gray-400">
                {(product.competitorCount || product.advertiserCount || 0) > 20
                  ? 'High competition — differentiate with price or faster delivery'
                  : 'Moderate competition — good entry opportunity'}
              </p>
            </div>
          </div>
        )}

        {/* ── International Opportunity ──────────────────────── */}
        {intl && (
          <div className="glass-card p-4 mb-4 border border-primary-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiZap className="text-accent-400" size={16} />
                <span className="text-sm font-medium text-gray-300">International Opportunity</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                intl.opportunityGap === 'HIGH'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : intl.opportunityGap === 'MEDIUM'
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}>
                {intl.opportunityGap} GAP
              </span>
            </div>
            <div className="space-y-2 mb-3">
              <p className="text-xs text-gray-400">
                Selling on <span className="text-white font-medium">{intl.globalStores}</span> Shopify stores globally
              </p>
              <p className="text-xs text-gray-400">
                Global price: <span className="text-white font-medium">{intl.avgGlobalPrice}</span>
                {intl.avgGlobalPricePKR > 0 && (
                  <span className="text-gray-600"> · {formatPKR(intl.avgGlobalPricePKR)} in Pakistan</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Shipping to Pakistan: <span className="text-white font-medium">{intl.shippingToPakistan}</span>
              </p>
              <p className="text-xs text-gray-400">
                Local availability: <span className="text-white font-medium">{intl.localAvailability}</span> products in PK market
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Opportunity Score</span>
                <span className="text-sm font-bold text-white">{intl.opportunityScore}/100</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    intl.opportunityScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : intl.opportunityScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                    : 'bg-gradient-to-r from-gray-500 to-gray-400'
                  }`}
                  style={{ width: `${intl.opportunityScore}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Ad Running Guide ───────────────────────────────── */}
        {adGuide && (
          <div className="glass-card p-4 mb-4 border border-primary-500/20">
            <div className="flex items-center gap-2 mb-4">
              <FiTarget className="text-primary-400" size={16} />
              <span className="text-sm font-medium text-gray-300">Ad Running Guide</span>
              <span className="ml-auto text-[10px] text-gray-600 px-1.5 py-0.5 bg-primary-500/10 rounded-full">
                {report?.adGuideSource === 'groq' ? 'Real-time AI' : 'Local Analysis'}
              </span>
            </div>

            {/* Target Audience */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Target Audience</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-gray-500 block mb-0.5">Locations</span>
                  <span className="text-gray-200">{adGuide.targetAudience?.locations?.slice(0, 3).join(', ') || 'All City'}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-gray-500 block mb-0.5">Age Range</span>
                  <span className="text-gray-200">{adGuide.targetAudience?.ageRange || '18-55'}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-gray-500 block mb-0.5">Gender</span>
                  <span className="text-gray-200">{adGuide.targetAudience?.gender || 'All'}</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-gray-500 block mb-0.5">Interests</span>
                  <span className="text-gray-200">{adGuide.targetAudience?.interests?.slice(0, 2).join(', ') || 'Online Shoppers'}</span>
                </div>
              </div>
            </div>

            {/* Budget + Best Time */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-1">Daily Budget</p>
                <p className="text-xs font-semibold text-primary-400">{adGuide.budget?.dailyBudget || 'Rs. 1,000'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-1">Total Campaign</p>
                <p className="text-xs font-semibold text-primary-400">{adGuide.budget?.totalBudget || 'Rs. 30,000'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 mb-1">Best Time</p>
                <p className="text-xs font-semibold text-primary-400">{adGuide.bestTime?.hours || '6 PM - 10 PM'}</p>
              </div>
            </div>

            {/* Best Days + Budget Strategy */}
            <div className="bg-white/5 rounded-lg px-3 py-2 mb-4 text-xs">
              <span className="text-gray-500">Best days: </span>
              <span className="text-gray-200">{adGuide.bestTime?.days?.join(', ') || 'Thu, Fri, Sat'}</span>
              <span className="text-gray-500 ml-3">Avoid: </span>
              <span className="text-gray-200">{adGuide.bestTime?.avoid || 'Monday mornings'}</span>
            </div>

            {/* Ad Copy Variations */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Ad Copy Variations</p>
              <div className="space-y-2">
                {adGuide.adCopyVariations?.map((copy, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-white mb-1">{copy.headline}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{copy.description}</p>
                    <span className="inline-block mt-1.5 text-[10px] bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full">
                      {copy.cta || 'Shop Now'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Recommendation */}
            {adGuide.visualRecommendations && (
              <div className="bg-white/5 rounded-lg px-3 py-2 mb-4 text-xs">
                <span className="text-gray-500">Creative: </span>
                <span className="text-gray-200 capitalize">{adGuide.visualRecommendations.creativeType}</span>
                {adGuide.visualRecommendations.duration && (
                  <><span className="text-gray-500 ml-3">Duration: </span><span className="text-gray-200">{adGuide.visualRecommendations.duration}</span></>
                )}
                {adGuide.visualRecommendations.textOverlay && (
                  <p className="mt-1"><span className="text-gray-500">Overlay: </span><span className="text-gray-200">{adGuide.visualRecommendations.textOverlay}</span></p>
                )}
              </div>
            )}

            {/* Estimated Results */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Estimated Results</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Reach',            value: adGuide.estimatedResults?.reach },
                  { label: 'Conversions',      value: adGuide.estimatedResults?.conversions },
                  { label: 'ROAS',             value: adGuide.estimatedResults?.roas },
                  { label: 'Cost/Conversion',  value: adGuide.estimatedResults?.costPerConversion },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                    <p className="text-xs font-semibold text-green-400">{value || '—'}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Based on {product.advertiserCount || 0} advertisers &amp; {product.totalAds || 0} active ads
              </p>
            </div>
          </div>
        )}

        {/* ── Local Suppliers ────────────────────────────────── */}
        {suppliers.length > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiShield className="text-green-400" size={16} />
              <span className="text-sm font-medium text-gray-300">Local Suppliers</span>
              <span className="ml-auto text-xs text-gray-600">from Hunting Goals database</span>
            </div>
            <div className="space-y-2">
              {suppliers.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{s.name}</p>
                      {s.verified && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full flex-shrink-0">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{s.city}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="p-2 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg transition-all"
                        title={s.phone}
                      >
                        <FiPhone size={14} />
                      </a>
                    )}
                    {s.website && (
                      <a
                        href={s.website.startsWith('http') ? s.website : `https://${s.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-lg transition-all"
                        title={s.website}
                      >
                        <FiGlobe size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
