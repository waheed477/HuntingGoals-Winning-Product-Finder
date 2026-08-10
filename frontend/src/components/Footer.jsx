import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ backgroundColor: 'var(--color-ink-2)', borderColor: 'var(--color-ink-4)' }}
    >
      <div className="shell py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--color-acid)' }}
              >
                <span className="font-display font-bold text-xs text-[var(--color-ink)]">HG</span>
              </div>
              <span className="font-display font-bold text-base tracking-tight text-[var(--color-bone)]">
                Hunting<span className="text-[var(--color-acid)]"> Goals</span>
              </span>
            </div>
            <p className="text-sm text-[var(--color-moss)] font-body">
              Pakistan's #1 Winning Product Hunter
            </p>
            <p className="text-xs mt-3 text-[var(--color-moss)] font-mono-label tracking-[0.1em]">
              © {new Date().getFullYear()} Hunting Goals. All rights reserved.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.25em] mb-3">
              Legal
            </h4>
            <ul className="space-y-2 text-sm font-body">
              <li>
                <Link to="/privacy-policy" className="text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.25em] mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-sm font-body">
              <li>
                <Link to="/about" className="text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors duration-200">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-[var(--color-moss)] hover:text-[var(--color-acid)] transition-colors duration-200">
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
