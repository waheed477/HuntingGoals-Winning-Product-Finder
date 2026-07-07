import { useState, useEffect } from 'react'
import { differenceInDays, addDays } from 'date-fns'
import { FiCalendar } from 'react-icons/fi'

const UPCOMING_EVENTS = [
  { name: 'Eid ul Adha', date: new Date('2025-06-06'), emoji: '🕌', color: 'from-green-600/20 to-emerald-900/20 border-green-500/20' },
  { name: 'Independence Day', date: new Date('2025-08-14'), emoji: '🇵🇰', color: 'from-green-700/20 to-green-900/20 border-green-500/20' },
  { name: 'Winter Season', date: new Date('2025-11-01'), emoji: '❄️', color: 'from-blue-600/20 to-blue-900/20 border-blue-500/20' },
  { name: 'Ramadan', date: new Date('2026-02-18'), emoji: '🌙', color: 'from-primary-600/20 to-primary-900/20 border-primary-500/20' },
]

function getNextEvent() {
  const now = new Date()
  const future = UPCOMING_EVENTS.filter((e) => e.date > now)
  if (future.length === 0) return UPCOMING_EVENTS[0]
  return future.sort((a, b) => a.date - b.date)[0]
}

export default function SeasonalBanner() {
  const event = getNextEvent()
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
