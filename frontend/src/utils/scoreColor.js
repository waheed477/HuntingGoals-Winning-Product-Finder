export function scoreColor(score) {
  if (score >= 75) {
    return {
      color: 'green',
      bgClass: 'bg-green-500/20',
      textClass: 'text-green-400',
      borderClass: 'border-green-500/30',
    }
  }
  if (score >= 50) {
    return {
      color: 'yellow',
      bgClass: 'bg-yellow-500/20',
      textClass: 'text-yellow-400',
      borderClass: 'border-yellow-500/30',
    }
  }
  return {
    color: 'red',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  }
}

export function getScoreColor(score) {
  return scoreColor(score).color
}

export function getScoreClasses(score) {
  const { bgClass, textClass, borderClass } = scoreColor(score)
  return `${bgClass} ${textClass} ${borderClass}`
}

export function getScoreBg(score) {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function getScoreLabel(score) {
  if (score >= 90) return 'Hot'
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Moderate'
  return 'Weak'
}
