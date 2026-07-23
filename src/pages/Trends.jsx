import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import TrendChart from '../components/TrendChart.jsx'
import { useAllTrends, useCategoryTrends, useRisingFalling } from '../hooks/useTrends.js'
import { FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi'
import { getScoreClasses } from '../utils/scoreColor.js'

const RANGE_OPTIONS = [
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
]

const CHART_COLORS = ['#6366f1', '#f97316', '#22c55e', '#ec4899', '#eab308']
const CATEGORY_COLORS = {
  Fashion: '#ec4899',
  Electronics: '#6366f1',
  Beauty: '#a855f7',
  Home: '#22c55e',
  Sports: '#f97316',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value?.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Trends() {
  const [range, setRange] = useState(30)
  const { data: trends } = useAllTrends(range)
  const { data: categoryData } = useCategoryTrends()
  const { data: risingFalling } = useRisingFalling()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Trends</h1>
          <p className="section-subtitle">Product search volume trends across Pakistan</p>
        </div>
        <div className="flex items-center gap-1 glass-card p-1">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRange(o.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                range === o.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 glass-card text-xs text-gray-500">
        <FiInfo size={13} />
        Data sourced from Google Trends Pakistan (simulated for demo purposes)
      </div>

      {trends && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trends.map((t, i) => (
            <div key={t.id} className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3">{t.name}</h3>
              <TrendChart
                data={t.data}
                color={CHART_COLORS[i % CHART_COLORS.length]}
                height={150}
              />
            </div>
          ))}
        </div>
      )}

      {categoryData && (
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-white mb-4">Category Trend Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={categoryData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {risingFalling && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-green-400" size={18} />
              <h3 className="text-base font-semibold text-white">Rising Products</h3>
            </div>
            <div className="space-y-3">
              {risingFalling.rising.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                  <span className="text-green-400 text-sm font-bold">{p.change}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getScoreClasses(p.score)}`}>
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingDown className="text-red-400" size={18} />
              <h3 className="text-base font-semibold text-white">Falling Products</h3>
            </div>
            <div className="space-y-3">
              {risingFalling.falling.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                  <span className="text-red-400 text-sm font-bold">{p.change}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getScoreClasses(p.score)}`}>
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
