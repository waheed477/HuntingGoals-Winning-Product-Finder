import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import useStore from '../store/useStore.js'

const CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books']
const PLATFORMS  = ['Facebook Ads', 'Daraz', 'TikTok Shop', 'Instagram', 'OLX']
const CITIES     = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala']

const CATEGORY_ICONS = {
  Fashion: '👗', Electronics: '📱', Beauty: '💄', Home: '🏠',
  Grocery: '🛒', Toys: '🧸', Sports: '⚽', Books: '📚',
}

const PLATFORM_ICONS = {
  'Facebook Ads': '📘', Daraz: '🛍️', 'TikTok Shop': '🎵', Instagram: '📸', OLX: '🏷️',
}

const STEPS = [
  { id: 1, title: 'What do you sell?',       sub: 'Pick product categories you are interested in.' },
  { id: 2, title: 'Your main city',          sub: 'Where are most of your customers based?' },
  { id: 3, title: 'Where do you sell?',      sub: 'Select all platforms you use or plan to use.' },
]

function ChipGrid({ options, selected, onChange, icons = {} }) {
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            selected.includes(opt)
              ? 'bg-primary-600/30 border-primary-500/50 text-white'
              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
          }`}
        >
          {icons[opt] && <span>{icons[opt]}</span>}
          {opt}
          {selected.includes(opt) && <FiCheck size={14} className="ml-auto text-primary-400" />}
        </button>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const user = useStore((s) => s.user)
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState([])
  const [city, setCity] = useState('')
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(false)

  const canNext = () => {
    if (step === 1) return categories.length > 0
    if (step === 2) return city !== ''
    if (step === 3) return platforms.length > 0
    return false
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ categories, city, platforms }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save preferences')
      toast.success('Setup complete! Welcome to Hunting Goals.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">TS</span>
            </div>
            <span className="font-bold text-white text-2xl tracking-tight">
              Trend<span className="text-accent-400">Spy</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Let's personalize your experience</h1>
          <p className="text-gray-400 text-sm">Takes less than a minute</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
                  step > s.id
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : step === s.id
                    ? 'bg-primary-600/20 border-primary-500 text-primary-400'
                    : 'bg-white/5 border-white/10 text-gray-600'
                }`}
              >
                {step > s.id ? <FiCheck size={14} /> : s.id}
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="mb-5">
            <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-1">
              Step {step} of {STEPS.length}
            </p>
            <h2 className="text-xl font-bold text-white">{STEPS[step - 1].title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{STEPS[step - 1].sub}</p>
          </div>

          <div className="mb-6">
            {step === 1 && (
              <ChipGrid options={CATEGORIES} selected={categories} onChange={setCategories} icons={CATEGORY_ICONS} />
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      city === c
                        ? 'bg-primary-600/30 border-primary-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <ChipGrid options={PLATFORMS} selected={platforms} onChange={setPlatforms} icons={PLATFORM_ICONS} />
            )}
          </div>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm transition-all"
              >
                <FiArrowLeft size={15} /> Back
              </button>
            )}
            <button
              onClick={step < STEPS.length ? () => setStep((s) => s + 1) : handleFinish}
              disabled={!canNext() || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step < STEPS.length ? (
                <>Next <FiArrowRight size={15} /></>
              ) : (
                <>Finish Setup <FiCheck size={15} /></>
              )}
            </button>
          </div>

          {step < STEPS.length && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
