import { Link } from 'react-router-dom'
import Footer from './Footer.jsx'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] flex flex-col">
      {/* Minimal public header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgb(15 17 10 / 0.92)',
          borderColor: 'var(--color-ink-4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="shell h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: 'var(--color-acid)' }}
            >
              <span className="font-display font-bold text-xs text-[var(--color-ink)]">HG</span>
            </div>
            <span className="font-display font-bold text-base tracking-tight text-[var(--color-bone)]">
              Hunting<span className="text-[var(--color-acid)]"> Goals</span>
            </span>
          </Link>

          <Link
            to="/login"
            className="text-sm font-body text-[var(--color-smoke)] hover:text-[var(--color-bone)] transition-colors px-3 py-1.5 hover:bg-[var(--color-ink-3)] rounded-lg"
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
