import rateLimit from 'express-rate-limit';

// Loopback requests are this same server's internal traffic (auto-scraper
// scheduler self-calls, health checks) — never rate-limit them.
const isLoopback = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

// General API — 100 req / 15 min per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please try again in 15 minutes.' },
  skip: (req) => req.method === 'OPTIONS' || isLoopback(req),
});

// Auth endpoints — 10 attempts / hour per IP (brute-force guard)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts — please try again in 1 hour.' },
});

// Scraper triggers — 5 / hour per IP (expensive operations).
// Loopback is exempt: the in-process auto-scraper self-calls these routes on a schedule.
export const scraperLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many scrape requests — please try again in 1 hour.' },
  skip: (req) => req.method === 'OPTIONS' || isLoopback(req),
});

// AI analysis — 20 / hour per IP (Groq API cost guard)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI analysis limit reached — please try again in 1 hour.' },
});
