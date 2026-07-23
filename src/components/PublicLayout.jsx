import { Link } from 'react-router-dom'
import Footer from './Footer.jsx'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-white/10 bg-gray-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">HG</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">
              Hunting<span className="text-primary-400"> Goals</span>
            </span>
          </Link>
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 hover:bg-white/5 rounded-lg"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  )
}
