import { NavLink } from 'react-router-dom'
import { FiGrid, FiSearch, FiEye, FiUser } from 'react-icons/fi'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'
import Footer from './Footer.jsx'
import { useSocket } from '../hooks/useSocket.js'

const BOTTOM_NAV = [
  { to: '/dashboard', icon: FiGrid,   label: 'Dashboard'    },
  { to: '/products',  icon: FiSearch, label: 'Products'     },
  { to: '/ad-spy',    icon: FiEye,    label: 'Ad Spy'       },
  { to: '/profile',   icon: FiUser,   label: 'Profile'      },
]

export default function Layout({ children }) {
  useSocket()

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-950/95 backdrop-blur-md border-t border-white/10 flex">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-all ${
                isActive ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'
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
