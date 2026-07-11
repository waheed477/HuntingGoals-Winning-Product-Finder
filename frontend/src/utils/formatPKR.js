export function formatPKR(amount) {
  if (amount >= 1000000) {
    return `Rs. ${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `Rs. ${(amount / 1000).toFixed(0)},${String(amount % 1000).padStart(3, '0')}`
  }
  return `Rs. ${amount.toLocaleString('en-PK')}`
}

export function formatPriceRange(min, max) {
  return `${formatPKR(min)} – ${formatPKR(max)}`
}
