import { useState, useEffect, useCallback } from 'react'
import { FiX, FiChevronRight, FiChevronLeft, FiSearch, FiBarChart2, FiTarget, FiBell } from 'react-icons/fi'

/**
 * WelcomeTour — first-visit floating guide (4 steps on hunting winning products).
 * - Non-blocking floating panel (user can explore while learning)
 * - Alternating slide-in from left / right
 * - localStorage flag → shows once; replay via the sidebar "?" button
 *   (dispatches window event 'hg:open-tour')
 */

const STORAGE_KEY = 'hg_welcome_tour_seen'
const OPEN_EVENT  = 'hg:open-tour'

const STEPS = [
  {
    icon:  FiSearch,
    side:  'left',
    title: 'Discover',
    body:  'Fresh winning products surface here daily — pulled live from Facebook ads across Pakistan. The higher the score, the stronger the signal.',
    tip:   'Start at the Product Hunt tab.',
  },
  {
    icon:  FiBarChart2,
    side:  'right',
    title: 'Validate',
    body:  'Open Score Breakdown, read the weekly trend — Rising beats Cooling — and check the Daraz demand bar for real orders and prices.',
    tip:   'Skip anything Cooling. Timing is everything.',
  },
  {
    icon:  FiTarget,
    side:  'left',
    title: 'Identify & Source',
    body:  'Hit Identify Exact Product and our AI pins down the exact item. Then Get Sourcing Advice gives you buy price, stock size and a ready ad angle.',
    tip:   'One click per product — cached forever after.',
  },
  {
    icon:  FiBell,
    side:  'right',
    title: 'Track',
    body:  'Create an Alert and switch on Email/WhatsApp in your Profile. When a matching winner appears, you get notified — even while you sleep.',
    tip:   'Alerts → min score, category, city. Done in 10 seconds.',
  },
]

export default function WelcomeTour() {
  const [open, setOpen]   = useState(false)
  const [step, setStep]   = useState(0)
  const [leaving, setLeaving] = useState(false)

  // First visit only — or when the sidebar "?" asks for a replay
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 800) // let the page settle first
        return () => clearTimeout(t)
      }
    } catch { /* storage blocked → stay quiet */ }
  }, [])

  useEffect(() => {
    const reopen = () => { setStep(0); setLeaving(false); setOpen(true) }
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  const close = useCallback(() => {
    setLeaving(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setTimeout(() => { setOpen(false); setLeaving(false) }, 350)
  }, [])

  if (!open) return null

  const s       = STEPS[step]
  const Icon    = s.icon
  const isLast  = step === STEPS.length - 1
  const slideCls = s.side === 'left' ? 'tour-slide-left' : 'tour-slide-right'

  return (
    <>
      <style>{`
        @keyframes tourInLeft  { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
        @keyframes tourInRight { from { opacity:0; transform:translateX(32px); }  to { opacity:1; transform:translateX(0); } }
        @keyframes tourFloatY  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-7px); } }
        @keyframes tourOut     { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(14px); } }
        .tour-slide-left  { animation: tourInLeft  .45s cubic-bezier(.22,1,.36,1) both; }
        .tour-slide-right { animation: tourInRight .45s cubic-bezier(.22,1,.36,1) both; }
        .tour-float       { animation: tourFloatY  3.2s ease-in-out infinite; }
        .tour-leaving     { animation: tourOut     .35s ease both; }
      `}</style>

      <div
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[70] w-[calc(100vw-2rem)] max-w-[340px] ${leaving ? 'tour-leaving' : ''}`}
        role="dialog"
        aria-label="Welcome tour"
      >
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-ink-2, #141418)',
            borderColor: 'rgba(200,245,66,0.25)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(200,245,66,0.06)',
          }}
        >
          {/* Mascot strip */}
          <div className="relative flex items-end gap-3 px-4 pt-3 pb-0" style={{ background: 'linear-gradient(135deg, rgba(200,245,66,0.10), transparent 55%)' }}>
            <div className="tour-float w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border" style={{ borderColor: 'rgba(200,245,66,0.3)' }}>
              <img src="/mascot-hunter.png" alt="Hunter mascot" className="w-full h-full object-cover" />
            </div>
            <div className="pb-1 min-w-0">
              <p className="font-mono-label text-[9px] uppercase tracking-[0.25em]" style={{ color: 'var(--color-acid)' }}>
                Quick start · step {step + 1}/4
              </p>
              <p className="font-display font-bold text-sm" style={{ color: 'var(--color-bone)' }}>Your first winning hunt</p>
            </div>
            <button
              onClick={close}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-moss)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-bone)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-moss)' }}
              title="Skip tour"
              aria-label="Skip tour"
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Sliding step body — key re-triggers the slide animation per step */}
          <div className="p-4 pt-3">
            <div key={step} className={slideCls}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center border" style={{ backgroundColor: 'rgba(200,245,66,0.1)', borderColor: 'rgba(200,245,66,0.25)', color: 'var(--color-acid)' }}>
                  <Icon size={12} />
                </span>
                <h3 className="font-display font-bold text-sm" style={{ color: 'var(--color-bone)' }}>{s.title}</h3>
              </div>
              <p className="font-body text-xs leading-relaxed" style={{ color: 'var(--color-smoke)' }}>{s.body}</p>
              <p className="font-body text-[11px] mt-2 italic" style={{ color: 'var(--color-moss)' }}>{s.tip}</p>
            </div>
          </div>

          {/* Footer: dots + nav */}
          <div className="flex items-center justify-between gap-2 px-4 pb-3.5">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 14 : 6,
                    height: 6,
                    backgroundColor: i === step ? 'var(--color-acid)' : 'var(--color-ink-4)',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((v) => v - 1)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                  style={{ color: 'var(--color-moss)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-bone)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-moss)' }}
                >
                  <FiChevronLeft size={12} /> Back
                </button>
              )}
              <button
                onClick={() => (isLast ? close() : setStep((v) => v + 1))}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-acid)', color: '#101014' }}
              >
                {isLast ? 'Start Hunting' : 'Next'} <FiChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
