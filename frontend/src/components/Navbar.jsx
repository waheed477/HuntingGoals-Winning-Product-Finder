import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiLogOut, FiUser, FiMenu, FiX, FiGrid, FiSearch, FiEye } from 'react-icons/fi'
import NotificationBell from './NotificationBell.jsx'
import useStore from '../store/useStore.js'

const MOBILE_NAV = [
  { to: '/dashboard', icon: FiGrid,   label: 'Dashboard'    },
  { to: '/products',  icon: FiSearch, label: 'Product Hunt' },
  { to: '/ad-spy',    icon: FiEye,    label: 'Ad Spy'       },
  { to: '/profile',   icon: FiUser,   label: 'Profile'      },
]

export default function Navbar() {
  const user    = useStore((s) => s.user)
  const profile = useStore((s) => s.profile)
  const logout  = useStore((s) => s.logout)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'User'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgb(15 17 10 / 0.92)',
          borderColor: 'var(--color-ink-4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ backgroundColor: 'var(--color-acid)' }}
          >
            <span className="font-display font-bold text-xs text-[var(--color-ink)]">HG</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[var(--color-bone)]">
            Hunting<span className="text-[var(--color-acid)]"> Goals</span>
          </span>
        </Link>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-3">
          {/* Live badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ backgroundColor: 'var(--color-ink-2)', borderColor: 'var(--color-ink-4)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ backgroundColor: 'var(--color-acid)' }}
            />
            <span className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.2em]">Live</span>
          </div>

          <NotificationBell />

          <div
            className="flex items-center gap-2 pl-3 border-l"
            style={{ borderColor: 'var(--color-ink-4)' }}
          >
            <Link
              to="/profile"
              className="flex items-center gap-2 group transition-all"
              title="View Profile"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 group-hover:border-[var(--color-acid)]"
                style={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-ink-4)' }}
              >
                <FiUser size={14} className="text-[var(--color-smoke)] group-hover:text-[var(--color-acid)] transition-colors" />
              </div>
              <span className="text-sm text-[var(--color-smoke)] group-hover:text-[var(--color-bone)] transition-colors font-body">
                {displayName}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="ml-1 p-1.5 rounded-lg transition-all duration-200 text-[var(--color-moss)] hover:text-[var(--color-acid)] hover:bg-[var(--color-ink-3)]"
              title="Logout"
            >
              <FiLogOut size={15} />
            </button>
          </div>
        </div>

        {/* Mobile right section */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg transition-all text-[var(--color-moss)] hover:text-[var(--color-bone)] hover:bg-[var(--color-ink-3)]"
            aria-label="Toggle menu"
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-16 left-0 right-0 z-30 border-b shadow-2xl"
          style={{
            backgroundColor: 'rgb(15 17 10 / 0.98)',
            borderColor: 'var(--color-ink-4)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <nav className="p-4 space-y-1">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body font-medium transition-all ${
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
            className="px-4 pb-4 pt-2 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--color-ink-4)' }}
          >
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border transition-all group-hover:border-[var(--color-acid)]"
                style={{ backgroundColor: 'var(--color-ink-3)', borderColor: 'var(--color-ink-4)' }}
              >
                <FiUser size={14} className="text-[var(--color-smoke)]" />
              </div>
              <span className="text-sm text-[var(--color-smoke)] group-hover:text-[var(--color-bone)] transition-colors">
                {displayName}
              </span>
            </Link>
            <button
              onClick={() => { setMenuOpen(false); handleLogout() }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-body text-[var(--color-moss)] hover:text-[var(--color-acid)] hover:bg-[var(--color-ink-3)] rounded-lg transition-all"
            >
              <FiLogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  )
}
