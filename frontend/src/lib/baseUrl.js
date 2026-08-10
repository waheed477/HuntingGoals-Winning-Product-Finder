/**
 * Normalize a service URL from environment config.
 * Accepts "https://app.onrender.com", "app.onrender.com" (scheme added),
 * with/without trailing slash. Empty input → '' (caller falls back to same-origin).
 */
export function normalizeBaseUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
