import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CITIES } from '../utils/cityList.js'
import { fetchCityProducts } from '../api/products.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function CityExplorer() {
  const [cityA, setCityA] = useState('Lahore')
  const [cityB, setCityB] = useState('Karachi')
  const [cityAProducts, setCityAProducts] = useState([])
  const [cityBProducts, setCityBProducts] = useState([])
  const [HeatMap, setHeatMap] = useState(null)

  useEffect(() => {
    import('../components/HeatMap.jsx').then((m) => setHeatMap(() => m.default))
  }, [])

  useEffect(() => {
    fetchCityProducts(cityA).then(setCityAProducts)
  }, [cityA])

  useEffect(() => {
    fetchCityProducts(cityB).then(setCityBProducts)
  }, [cityB])

  const compareData = (() => {
    const allNames = new Set([
      ...cityAProducts.map((p) => p.name.substring(0, 15) + '..'),
      ...cityBProducts.map((p) => p.name.substring(0, 15) + '..'),
    ])
    return Array.from(allNames).slice(0, 6).map((name) => {
      const aProduct = cityAProducts.find((p) => (p.name.substring(0, 15) + '..') === name)
      const bProduct = cityBProducts.find((p) => (p.name.substring(0, 15) + '..') === name)
      return {
        name,
        [cityA]: aProduct?.winScore || 0,
        [cityB]: bProduct?.winScore || 0,
      }
    }).filter((d) => d[cityA] > 0 || d[cityB] > 0)
  })()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">City Explorer</h1>
        <p className="section-subtitle">Explore product demand across Pakistan cities</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="glass-card p-4 h-[460px]">
            <p className="text-sm font-medium text-gray-300 mb-3">
              Pakistan Demand Heatmap — Click a city for top products
            </p>
            {HeatMap ? (
              <div style={{ height: 'calc(100% - 32px)' }}>
                <HeatMap
                  cityProducts={Object.fromEntries(
                    [cityA, cityB].map((c) => [c, c === cityA ? cityAProducts : cityBProducts])
                  )}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Demand Legend</h3>
            <div className="space-y-2">
              {[
                { color: '#ef4444', label: 'Very High (80–100%)', cities: 'Karachi, Lahore' },
                { color: '#f97316', label: 'High (60–80%)', cities: 'Islamabad, Faisalabad' },
                { color: '#eab308', label: 'Medium (40–60%)', cities: 'Multan, Sialkot' },
                { color: '#22c55e', label: 'Low (0–40%)', cities: 'Quetta, Peshawar' },
              ].map((l) => (
                <div key={l.label} className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: l.color }} />
                  <div>
                    <p className="text-xs text-gray-300">{l.label}</p>
                    <p className="text-xs text-gray-600">{l.cities}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Top Products in {cityA}</h3>
            {cityAProducts.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                <span className="text-xs text-gray-300 flex-1 truncate">{p.name}</span>
                <span className={`text-xs font-bold ${p.winScore >= 75 ? 'text-green-400' : p.winScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {p.winScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="text-base font-semibold text-white">City vs City Comparison</h3>
          <div className="flex items-center gap-3">
            <select
              value={cityA}
              onChange={(e) => setCityA(e.target.value)}
              className="select-field text-sm py-2 w-auto min-w-28"
            >
              {CITIES.filter((c) => c !== cityB).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-gray-500 text-sm">vs</span>
            <select
              value={cityB}
              onChange={(e) => setCityB(e.target.value)}
              className="select-field text-sm py-2 w-auto min-w-28"
            >
              {CITIES.filter((c) => c !== cityA).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={compareData} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey={cityA} fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey={cityB} fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
