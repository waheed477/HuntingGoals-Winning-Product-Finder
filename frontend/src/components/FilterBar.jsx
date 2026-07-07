import { FiRefreshCw } from 'react-icons/fi'
import { CITIES, CATEGORIES } from '../utils/cityList.js'
import useStore from '../store/useStore.js'

export default function FilterBar({ showScoreFilter = true }) {
  const selectedCity = useStore((s) => s.selectedCity)
  const selectedCategory = useStore((s) => s.selectedCategory)
  const minWinScore = useStore((s) => s.minWinScore)
  const setSelectedCity = useStore((s) => s.setSelectedCity)
  const setSelectedCategory = useStore((s) => s.setSelectedCategory)
  const setMinWinScore = useStore((s) => s.setMinWinScore)

  const reset = () => {
    setSelectedCity('All')
    setSelectedCategory('All')
    setMinWinScore(0)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selectedCity}
        onChange={(e) => setSelectedCity(e.target.value)}
        className="select-field text-sm py-2 w-auto min-w-32"
      >
        <option value="All">All Cities</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="select-field text-sm py-2 w-auto min-w-36"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {showScoreFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">Min Score:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minWinScore}
            onChange={(e) => setMinWinScore(Number(e.target.value))}
            className="input-field text-sm py-2 w-20"
            placeholder="0"
          />
        </div>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-2 rounded-xl transition-all duration-200"
      >
        <FiRefreshCw size={14} />
        Reset
      </button>
    </div>
  )
}
