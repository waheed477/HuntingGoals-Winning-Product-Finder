/**
 * Shared CORS origin allow-list (used by both the Express API and Socket.io).
 *
 * FRONTEND_URL may contain a single origin or a comma-separated list, e.g.:
 *   FRONTEND_URL=https://huntinggoals.netlify.app
 *   FRONTEND_URL=https://app.example.com,https://staging.example.com
 *
 * Local dev origins are always allowed when NODE_ENV !== 'production'.
 * Requests without an Origin header (server-to-server, curl, cron
 * self-calls) are not subject to CORS and always pass the API middleware.
 */

const DEV_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getAllowedOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    // bare hostnames (e.g. Render's fromService host property) get https://
    .map((o) => (/^https?:\/\//i.test(o) ? o : `https://${o}`));

  const origins = new Set(fromEnv);

  if (process.env.NODE_ENV !== 'production') {
    DEV_ORIGINS.forEach((o) => origins.add(o));
  }

  return [...origins];
}

/**
 * Express middleware implementing the allow-list.
 * - No Origin header        → allowed (non-browser clients)
 * - Origin in allow-list    → reflected with credentials
 * - Anything else           → blocked (no CORS headers emitted)
 */
export function corsAllowlist(req, res, next) {
  const origin = req.headers.origin;

  if (origin) {
    const normalized = origin.replace(/\/+$/, '');
    if (getAllowedOrigins().includes(normalized)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, x-admin-key'
      );
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
