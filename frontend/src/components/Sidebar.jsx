import { NavLink } from 'react-router-dom'
import { FiGrid, FiSearch, FiEye, FiUser, FiHelpCircle } from 'react-icons/fi'

const NAV_ITEMS = [
  { to: '/dashboard', icon: FiGrid,   label: 'Dashboard'    },
  { to: '/products',  icon: FiSearch, label: 'Product Hunt' },
  { to: '/ad-spy',    icon: FiEye,    label: 'Ad Spy'       },
  { to: '/profile',   icon: FiUser,   label: 'Profile'      },
]

export default function Sidebar() {
  return (
    <aside
      className="w-56 flex-shrink-0 border-r h-full overflow-y-auto hidden md:flex flex-col py-4"
      style={{
        backgroundColor: 'var(--color-ink-2)',
        borderColor: 'var(--color-ink-4)',
      }}
    >
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[var(--color-acid)] bg-[var(--color-ink-3)] border border-[var(--color-ink-4)]'
                  : 'text-[var(--color-moss)] hover:text-[var(--color-bone)] hover:bg-[var(--color-ink-3)]'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div
        className="px-3 mt-4 space-y-2 border-t pt-4"
        style={{ borderColor: 'var(--color-ink-4)' }}
      >
        {/* Replay welcome tour */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('hg:open-tour'))}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 text-[var(--color-moss)] hover:text-[var(--color-bone)] hover:bg-[var(--color-ink-3)]"
          title="Replay the quick-start tour"
        >
          <FiHelpCircle size={17} />
          Quick Tour
        </button>

        {/* Info card */}
        <div
          className="p-3 rounded-xl border"
          style={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-ink-4)' }}
        >
          <p className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.2em] mb-1">
            Pakistan E-Commerce
          </p>
          <p className="text-xs text-[var(--color-moss)] font-body leading-relaxed">
            Data: Daraz · OLX · Facebook Ads
          </p>
        </div>
      </div>
    </aside>
  )
}
