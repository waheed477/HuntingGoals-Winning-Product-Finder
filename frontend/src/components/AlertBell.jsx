import { FiBell } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore.js'

export default function AlertBell() {
  const alertCount = useStore((s) => s.alertCount)

  return (
    <Link
      to="/alerts"
      className="relative p-2 rounded-xl hover:bg-white/10 transition-colors duration-200 text-gray-400 hover:text-white"
    >
      <FiBell size={20} />
      {alertCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-500 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </Link>
  )
}
