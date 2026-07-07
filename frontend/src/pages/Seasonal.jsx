import { useState, useEffect } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns'
import ProductCard from '../components/ProductCard.jsx'
import { fetchTopProducts } from '../api/products.js'
import { FiChevronDown, FiChevronUp, FiCalendar, FiClock } from 'react-icons/fi'

const SEASONS = [
  {
    id: 'ramadan',
    name: 'Ramadan',
    emoji: '🌙',
    date: new Date('2026-02-18'),
    color: 'from-primary-600/30 to-purple-900/20 border-primary-500/30',
    icon: '🌙',
    categories: ['Fashion', 'Beauty', 'Home'],
    description: 'Highest sales season. Demand spikes for food items, modest fashion, home decor.',
  },
  {
    id: 'eid-fitr',
    name: 'Eid ul Fitr',
    emoji: '🎉',
    date: new Date('2026-03-20'),
    color: 'from-green-600/30 to-emerald-900/20 border-green-500/30',
    icon: '🎉',
    categories: ['Fashion', 'Beauty'],
    description: 'Fashion and gifting season. Khaddar, formal wear, cosmetics top sellers.',
  },
  {
    id: 'eid-adha',
    name: 'Eid ul Adha',
    emoji: '🐑',
    date: new Date('2025-06-06'),
    color: 'from-yellow-600/30 to-orange-900/20 border-yellow-500/30',
    icon: '🐑',
    categories: ['Fashion', 'Home', 'Sports'],
    description: 'Big spending on meat, appliances, and modest fashion.',
  },
  {
    id: 'wedding',
    name: 'Wedding Season',
    emoji: '💍',
    date: new Date('2025-10-15'),
    color: 'from-pink-600/30 to-rose-900/20 border-pink-500/30',
    icon: '💍',
    categories: ['Fashion', 'Beauty', 'Home'],
    description: 'Oct–Dec, Feb–Apr. Jewelry, bridal suits, decor drive massive sales.',
  },
  {
    id: 'back-to-school',
    name: 'Back to School',
    emoji: '📚',
    date: new Date('2025-08-25'),
    color: 'from-blue-600/30 to-sky-900/20 border-blue-500/30',
    icon: '📚',
    categories: ['Electronics', 'Toys', 'Sports'],
    description: 'Aug–Sep. Bags, stationery, footwear, and electronics for students.',
  },
  {
    id: 'winter',
    name: 'Winter Season',
    emoji: '❄️',
    date: new Date('2025-11-01'),
    color: 'from-cyan-600/30 to-blue-900/20 border-cyan-500/30',
    icon: '❄️',
    categories: ['Home', 'Fashion', 'Electronics'],
    description: 'Nov–Feb. Heaters, blankets, warm clothing dominate all platforms.',
  },
]

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({})

  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const future = targetDate > now ? targetDate : new Date(targetDate.setFullYear(now.getFullYear() + 1))
      const totalSeconds = Math.max(0, Math.floor((future - now) / 1000))
      const days = Math.floor(totalSeconds / 86400)
      const hours = Math.floor((totalSeconds % 86400) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setTimeLeft({ days, hours, minutes, seconds, total: totalSeconds })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

function CountdownUnit({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-black text-white tabular-nums">{String(value).padStart(2, '0')}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function SeasonCard({ season, products, isExpanded, onToggle }) {
  const countdown = useCountdown(season.date)
  const seasonProducts = products.filter((p) => season.categories.includes(p.category)).slice(0, 3)

  const isNear = countdown.total < 30 * 86400

  return (
    <div className={`glass-card bg-gradient-to-br ${season.color} overflow-hidden`}>
      <div
        className="p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{season.emoji}</span>
            <div>
              <h3 className="text-base font-bold text-white">{season.name}</h3>
              <p className="text-xs text-gray-400">{season.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isNear && (
              <span className="text-xs bg-accent-500/20 text-accent-400 border border-accent-500/30 px-2 py-0.5 rounded-full font-medium">
                Coming Soon
              </span>
            )}
            {isExpanded ? <FiChevronUp className="text-gray-400" size={16} /> : <FiChevronDown className="text-gray-400" size={16} />}
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4">
          <FiClock className="text-gray-500" size={13} />
          <span className="text-xs text-gray-500 mr-3">Countdown:</span>
          <div className="flex items-center gap-3">
            <CountdownUnit value={countdown.days} label="d" />
            <span className="text-gray-600 font-bold">:</span>
            <CountdownUnit value={countdown.hours} label="h" />
            <span className="text-gray-600 font-bold">:</span>
            <CountdownUnit value={countdown.minutes} label="m" />
            <span className="text-gray-600 font-bold">:</span>
            <CountdownUnit value={countdown.seconds} label="s" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-white/10 pt-4">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
            <FiCalendar size={12} />
            Top products for this season
          </p>
          {seasonProducts.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No products found for this season.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {seasonProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Seasonal() {
  const [expanded, setExpanded] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopProducts(30)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  const nextSeason = [...SEASONS].sort((a, b) => {
    const now = new Date()
    const da = a.date > now ? a.date : new Date(a.date.getFullYear() + 1, a.date.getMonth(), a.date.getDate())
    const db = b.date > now ? b.date : new Date(b.date.getFullYear() + 1, b.date.getMonth(), b.date.getDate())
    return da - db
  })[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Seasonal Calendar</h1>
        <p className="section-subtitle">Plan ahead for Pakistan's biggest shopping seasons</p>
      </div>

      {nextSeason && (
        <div className={`glass-card bg-gradient-to-br ${nextSeason.color} p-5`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{nextSeason.emoji}</span>
            <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">Next Major Season</span>
          </div>
          <h2 className="text-xl font-bold text-white">{nextSeason.name}</h2>
          <p className="text-sm text-gray-400">{nextSeason.description}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {SEASONS.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              products={products}
              isExpanded={expanded === season.id}
              onToggle={() => toggle(season.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
