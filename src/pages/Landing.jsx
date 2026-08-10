import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer.jsx'

const MARQUEE_ITEMS = [
  'Live Facebook Ads', 'Win Score AI', 'Pakistan Markets', 'Profit Estimator',
  'Instagram Spy', 'Supplier Links', 'City Heatmaps', 'Seasonal Trends',
  'Daraz · OLX · Facebook', 'Ad Copy Generator', 'Real-time Alerts', 'Free Forever',
]

export default function Landing() {
  const [liveStats, setLiveStats] = useState(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((json) => setLiveStats(json?.data || null))
      .catch(() => setLiveStats(null))
  }, [])

  const adsTracked = liveStats?.totalAds ?? null

  return (
    <div className="min-h-screen bg-[var(--color-ink)]">

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'rgb(15 17 10 / 0.92)',
          borderColor: 'var(--color-ink-4)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="shell h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: 'var(--color-acid)' }}
            >
              <span className="font-display font-bold text-xs text-[var(--color-ink)]">HG</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-[var(--color-bone)]">
              Hunting<span className="text-[var(--color-acid)]"> Goals</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-body text-[var(--color-smoke)] hover:text-[var(--color-bone)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-ink-3)]"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="btn-shine inline-flex items-center px-5 py-2 text-sm font-display font-bold rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(200,245,66,0.25)]"
              style={{
                backgroundColor: 'var(--color-acid)',
                color: 'var(--color-ink)',
              }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="gridlines-dark sec relative overflow-hidden">
        {/* Glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(200,245,66,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="shell relative z-10">
          <div className="text-center max-w-4xl mx-auto">

            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8 reveal"
              style={{
                backgroundColor: 'var(--color-ink-2)',
                borderColor: 'var(--color-ink-4)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full pulse-dot"
                style={{ backgroundColor: 'var(--color-acid)' }}
              />
              <span className="font-mono-label text-[10px] text-[var(--color-smoke)] uppercase tracking-[0.25em]">
                Live — Real Facebook & Instagram Ads
              </span>
            </div>

            {/* H1 */}
            <h1
              className="font-display font-bold leading-[0.92] tracking-[-0.02em] reveal"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
            >
              <span className="text-[var(--color-bone)]">Find Winning</span>
              <br />
              <span className="text-outline">Products First</span>
            </h1>

            <p className="mt-8 text-lg text-[var(--color-smoke)] max-w-2xl mx-auto leading-relaxed font-body reveal">
              Hunting Goals analyzes real Facebook & Instagram ads to surface exactly what's
              trending in Pakistan — with profit estimates, AI ad copy, and supplier links.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 reveal">
              <Link
                to="/login"
                className="btn-shine inline-flex items-center justify-center gap-2 px-8 py-4 font-display font-bold text-base rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(200,245,66,0.3)]"
                style={{ backgroundColor: 'var(--color-acid)', color: 'var(--color-ink)' }}
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-body border rounded-xl transition-all duration-300 hover:bg-[var(--color-ink-3)]"
                style={{
                  color: 'var(--color-smoke)',
                  borderColor: 'var(--color-ink-4)',
                }}
              >
                How It Works
              </a>
            </div>

            <p className="mt-5 font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.2em] reveal">
              ✦ 100% Free · No credit card · No limits ✦
            </p>
          </div>
        </div>
      </section>

      {/* ── Marquee strip ── */}
      <div
        className="py-3 border-y overflow-hidden"
        style={{ borderColor: 'var(--color-ink-4)', backgroundColor: 'var(--color-ink-2)' }}
      >
        <div className="marquee overflow-hidden">
          <div className="marquee-track gap-8 flex">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.25em] flex-shrink-0"
              >
                {item}
                <span className="text-[var(--color-ink-4)] mx-4">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <section className="sec" style={{ backgroundColor: 'var(--color-ink)' }}>
        <div className="shell">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: adsTracked === null ? '—' : adsTracked > 0 ? `${adsTracked}+` : 'Live', label: 'Ads Tracked' },
              { value: '8',    label: 'Categories' },
              { value: '10',   label: 'Cities Covered' },
              { value: '100%', label: 'Free to Use' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="glass-card p-5 text-center card-3d-hover"
              >
                <p className="font-display font-bold text-3xl text-[var(--color-acid)] tracking-tight">{value}</p>
                <p className="font-mono-label text-[10px] text-[var(--color-moss)] uppercase tracking-[0.2em] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="sec gridlines-dark scroll-mt-16">
        <div className="shell">
          <div className="text-center mb-14 reveal">
            <p className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.3em] mb-4">
              — Process —
            </p>
            <h2
              className="font-display font-bold text-[var(--color-bone)] leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}
            >
              Three Steps to Your
              <br />
              <span className="text-outline">Next Winner</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                emoji: '📝',
                title: 'Sign Up Free',
                desc: 'Create your account in 30 seconds. No credit card, no commitment — instant access.',
              },
              {
                step: '02',
                emoji: '🔍',
                title: 'Discover Winners',
                desc: 'Browse real-time winning products from live Facebook & Instagram ads. Filter by city, season, or category.',
              },
              {
                step: '03',
                emoji: '🚀',
                title: 'Source & Sell',
                desc: 'Get AI-powered profit estimates, ready-to-use ad copy, and supplier links — all in one place.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="glass-card card-3d-hover p-6 reveal"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="flex items-start justify-between mb-5">
                  <span className="text-3xl">{item.emoji}</span>
                  <span
                    className="font-mono-label text-[10px] text-[var(--color-acid)] tracking-[0.25em]"
                  >
                    STEP {item.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-[var(--color-bone)] mb-2 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-moss)] font-body leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free Banner ── */}
      <section className="py-12" style={{ backgroundColor: 'var(--color-ink-2)' }}>
        <div className="shell">
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-5 p-8 rounded-2xl border text-center sm:text-left"
            style={{ borderColor: 'var(--color-ink-4)', backgroundColor: 'var(--color-ink-3)' }}
          >
            <span className="text-4xl floaty">🎉</span>
            <div>
              <p className="font-display font-bold text-xl text-[var(--color-bone)] tracking-tight">
                All services are <span className="text-[var(--color-acid)]">100% FREE</span>
              </p>
              <p className="text-sm text-[var(--color-moss)] mt-1 font-body">
                No limits, no hidden charges. Start finding winning products today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sec gridlines-dark relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(200,245,66,0.05) 0%, transparent 70%)' }}
        />
        <div className="shell relative z-10 text-center">
          <p className="font-mono-label text-[10px] text-[var(--color-acid)] uppercase tracking-[0.3em] mb-5">
            — Get Started —
          </p>
          <h2
            className="font-display font-bold text-[var(--color-bone)] leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}
          >
            Ready to Find Your
            <br />
            <span className="text-outline">Next Winning Product?</span>
          </h2>
          <p className="text-[var(--color-moss)] max-w-xl mx-auto mb-8 font-body">
            Join hundreds of Pakistani sellers using Hunting Goals to stay ahead of the competition.
          </p>
          <Link
            to="/login"
            className="btn-shine inline-flex items-center gap-2 px-8 py-4 font-display font-bold text-base rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(200,245,66,0.3)]"
            style={{ backgroundColor: 'var(--color-acid)', color: 'var(--color-ink)' }}
          >
            Get Started — It's Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
