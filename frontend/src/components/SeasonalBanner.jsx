import { differenceInDays } from 'date-fns'

// Fixed-date national holidays recur every year on the same day.
// Islamic holidays (Eid ul Adha, Ramadan) shift ~10-11 days earlier each
// year — these anchor dates should be updated annually to the Hijri calendar.
const FIXED_EVENTS = [
  { name: 'Independence Day', month: 8,  day: 14, emoji: '🇵🇰', color: 'from-green-700/20 to-green-900/20 border-green-500/20' },
  { name: 'Winter Season',    month: 11, day: 1,  emoji: '❄️', color: 'from-blue-600/20 to-blue-900/20 border-blue-500/20' },
]

// Islamic-calendar events — anchor to their next known Gregorian occurrence.
// Update these each year (or replace with a Hijri-conversion library).
const LUNAR_EVENTS = [
  { name: 'Eid ul Adha', date: '2027-05-27', emoji: '🕌', color: 'from-green-600/20 to-emerald-900/20 border-green-500/20' },
  { name: 'Ramadan',     date: '2027-02-08', emoji: '🌙', color: 'from-primary-600/20 to-primary-900/20 border-primary-500/20' },
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
    <div className={`glass-card p-4 bg-gradient-to-r ${event.color} flex items-center gap-3`}>
      <span className="text-2xl">{event.emoji}</span>
      <div>
        <p className="text-white font-semibold text-sm">{event.name}</p>
        <p className="text-gray-300 text-xs">
          {daysLeft > 0 ? `Starts in ${daysLeft} days` : 'Starting soon'} — stock up now!
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-2xl font-bold text-white">{daysLeft}</p>
        <p className="text-xs text-gray-400">days</p>
      </div>
    </div>
  )
}
