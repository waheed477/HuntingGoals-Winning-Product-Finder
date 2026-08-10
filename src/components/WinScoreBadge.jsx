import { getScoreClasses, getScoreLabel } from '../utils/scoreColor.js'

export default function WinScoreBadge({ score, size = 'md' }) {
  const classes = getScoreClasses(score)
  const label = getScoreLabel(score)

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5',
    md: 'text-[10px] px-3 py-1',
    lg: 'text-xs px-4 py-1.5',
  }

  return (
    <span className={`badge-premium inline-flex items-center gap-1.5 rounded-full font-semibold border ${classes} ${sizeClasses[size]}`}>
      <span className="font-bold">{score}</span>
      <span className="opacity-80">{label}</span>
    </span>
  )
}
