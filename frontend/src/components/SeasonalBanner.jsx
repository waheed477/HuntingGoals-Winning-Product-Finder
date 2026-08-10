import { differenceInDays } from 'date-fns'

// Fixed-date national holidays recur every year on the same day.
// Islamic holidays (Eid ul Adha, Ramadan) shift ~10-11 days earlier each
// year — these anchor dates should be updated annually to the Hijri calendar.
const FIXED_EVENTS = [
  { name: 'Independence Day', month: 8,  day: 14, emoji: '🇵🇰', color: 'from-green-700/20 to-green-900/20', borderColor: 'border-green-500/20' },
  { name: 'Winter Season',    month: 11, day: 1,  emoji: '❄️',  color: 'from-blue-600/20 to-blue-900/20',   borderColor: 'border-blue-500/20'  },
]

// Islamic-calendar events — anchor to their next known Gregorian occurrence.
// Update these each year (or replace with a Hijri-conversion library).
const LUNAR_EVENTS = [
  { name: 'Eid ul Adha', date: '2027-05-27', emoji: '🕌', color: 'from-green-600/20 to-emerald-900/20',   borderColor: 'border-green-500/20' },
  { name: 'Ramadan',     date: '2027-02-08', emoji: '🌙', color: 'from-[var(--color-ink-3)] to-[var(--color-ink-2)]', borderColor: 'border-[var(--color-acid)]/20' },
]

function nextOccurrence(month, day, now) {
  let year = now.getFullYear()
  let d = new Date(year, month - 1, day)
  if (d < now) d = new Date(year + 1, month - 1, day)
  return d
}

function getNextEvent() {
  const now = new Date()
  const candidates = [
    ...FIXED_EVENTS.map((e) => ({ ...e, date: nextOccurrence(e.month, e.day, now) })),
    ...LUNAR_EVENTS.map((e) => ({ ...e, date: new Date(e.date) })).filter((e) => e.date > now),
  ]
  return candidates.sort((a, b) => a.date - b.date)[0]
}

export default function SeasonalBanner() {
  const event = getNextEvent()
  if (!event) return null
  const daysLeft = differenceInDays(event.date, new Date())

  return (
    <div className={`glass-card p-4 bg-gradient-to-r ${event.color} border ${event.borderColor} flex items-center gap-3`}>
      <span className="text-2xl">{event.emoji}</span>
      <div>
        <p className="font-display font-semibold text-sm" style={{ color: 'var(--color-bone)' }}>{event.name}</p>
        <p className="font-body text-xs" style={{ color: 'var(--color-smoke)' }}>
          {daysLeft > 0 ? `Starts in ${daysLeft} days` : 'Starting soon'} — stock up now!
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-bone)' }}>{daysLeft}</p>
        <p className="font-mono-label text-[9px] uppercase tracking-[0.15em]" style={{ color: 'var(--color-smoke)' }}>days</p>
      </div>
    </div>
  )
}
