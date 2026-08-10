import { NavLink } from 'react-router-dom'
import { FiGrid, FiSearch, FiEye, FiUser } from 'react-icons/fi'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'
import { useSocket } from '../hooks/useSocket.js'

const BOTTOM_NAV = [
  { to: '/dashboard', icon: FiGrid,   label: 'Dashboard' },
  { to: '/products',  icon: FiSearch, label: 'Products'  },
  { to: '/ad-spy',    icon: FiEye,    label: 'Ad Spy'    },
  { to: '/profile',   icon: FiUser,   label: 'Profile'   },
]

export default function Layout({ children }) {
  useSocket()

  return (
    <div className="min-h-screen bg-[var(--color-ink)] flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t"
        style={{
          backgroundColor: 'var(--color-ink-2)',
          borderColor: 'var(--color-ink-4)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all font-mono-label text-[10px] uppercase tracking-[0.15em] ${
                isActive
                  ? 'text-[var(--color-acid)]'
                  : 'text-[var(--color-moss)] hover:text-[var(--color-smoke)]'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
