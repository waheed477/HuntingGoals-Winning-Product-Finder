import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiLogOut, FiUser, FiMenu, FiX, FiGrid, FiSearch, FiEye } from 'react-icons/fi'
import AlertBell from './AlertBell.jsx'
import NotificationBell from './NotificationBell.jsx'
import ThemeToggle from './ThemeToggle.jsx'
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
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/10 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">HG</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Hunting<span className="gradient-text"> Goals</span>
          </span>
        </Link>

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 glass-card">
            <div className="live-dot" />
            <span className="text-xs text-gray-300">Live</span>
          </div>

          <AlertBell />
          <NotificationBell />
          <ThemeToggle variant="navbar" />

          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <Link
              to="/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="View Profile"
            >
              <div className="w-8 h-8 bg-primary-600/30 border border-primary-500/30 rounded-full flex items-center justify-center">
                <FiUser size={14} className="text-primary-400" />
              </div>
              <span className="text-sm text-gray-300">{displayName}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="ml-1 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              title="Logout"
            >
              <FiLogOut size={15} />
            </button>
          </div>
        </div>

        {/* Mobile right section */}
        <div className="flex md:hidden items-center gap-2">
          <AlertBell />
          <NotificationBell />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-white/10 shadow-xl">
          <nav className="p-4 space-y-1">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 pb-4 pt-2 border-t border-white/10 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-primary-600/30 border border-primary-500/30 rounded-full flex items-center justify-center">
                <FiUser size={14} className="text-primary-400" />
              </div>
              <span className="text-sm text-gray-300">{displayName}</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="navbar" />
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <FiLogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
