import { FiTarget, FiZap, FiTrendingUp, FiMapPin } from 'react-icons/fi'
import PublicLayout from '../components/PublicLayout.jsx'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: FiTarget,
    title: 'Our Mission',
    body: 'Hunting Goals exists to level the playing field for Pakistani e-commerce sellers. We provide the same product intelligence that large brands pay thousands of dollars for — accessible to every seller, regardless of size.',
  },
  {
    icon: FiZap,
    title: 'What We Do',
    body: 'We analyze thousands of Facebook and Instagram ads running across Pakistan every day, calculate Win Scores based on advertiser count, longevity, and category demand, and surface the top-performing products before they become oversaturated.',
  },
  {
    icon: FiTrendingUp,
    title: 'Why We Exist',
    body: 'Most Pakistani sellers discover trending products weeks too late — after the market is already flooded. Hunting Goals gives you a first-mover advantage with real-time ad intelligence, AI-powered analysis, and city-specific demand maps so you can act fast.',
  },
  {
    icon: FiMapPin,
    title: 'Built in Pakistan',
    body: 'We are a Pakistan-first platform, built by sellers for sellers. All data is sourced from Pakistan-specific Facebook ad markets, pricing is in PKR, and city demand maps cover Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, and Quetta.',
  },
]

const STATS = [
  { value: 'Live',  label: 'Facebook Ad Data' },
  { value: '10',    label: 'Major Cities Covered' },
  { value: '8',     label: 'Product Categories' },
  { value: '24/7',  label: 'Live Intelligence' },
]

export default function About() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">Our Story</span>
          <h1 className="text-4xl font-bold text-white mt-3 mb-4 leading-tight">
            Built for Pakistan's Sellers
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Hunting Goals helps Pakistani sellers find winning products using real Facebook and
            Instagram ad intelligence — before the competition does.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
          {STATS.map(({ value, label }) => (
            <div key={label} className="glass-card p-5 text-center">
              <p className="text-2xl font-bold text-primary-400 mb-1">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Feature blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass-card p-6">
              <div className="w-10 h-10 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center mb-4">
                <Icon size={18} className="text-primary-400" />
              </div>
              <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="glass-card p-8 text-center border border-primary-500/20">
          <h3 className="text-xl font-bold text-white mb-2">Ready to find your next winning product?</h3>
          <p className="text-gray-400 text-sm mb-6">Join thousands of Pakistani sellers already using Hunting Goals.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl font-medium text-sm transition-all"
          >
            Get Started Free
          </Link>
        </div>

      </div>
    </PublicLayout>
  )
}
