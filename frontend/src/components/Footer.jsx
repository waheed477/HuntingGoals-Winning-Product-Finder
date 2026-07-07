import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-gray-950/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[color:var(--bg-hover)] bg-[color:var(--border)] opacity-[1]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">HG</span>
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                Hunting<span className="text-primary-400"> Goals</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Pakistan's #1 Winning Product Hunter
            </p>
            <p className="text-xs mt-3 text-[color:var(--text-secondary)]">
              © {new Date().getFullYear()} Hunting Goals. All rights reserved.
            </p>
          </div>

          {/* Legal */}
          <div className="text-[color:var(--primary-dark)]">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-gray-500 hover:text-primary-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-500 hover:text-primary-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="text-[color:var(--text-secondary)]">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-gray-500 hover:text-primary-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-500 hover:text-primary-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-500 hover:text-primary-400 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  )
}
