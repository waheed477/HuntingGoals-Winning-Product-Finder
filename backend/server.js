import 'dotenv/config'; // must run first: loads backend/.env for local dev (no-op on Render where env is injected)
import { parse, fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { join } from 'path';
import http          from 'http';
import express       from 'express';
import next          from 'next';
import { logRequest, logError }                                   from './middleware/logger.js';
import { apiLimiter, authLimiter, scraperLimiter, aiLimiter }     from './middleware/rateLimit.js';
import { corsAllowlist, getAllowedOrigins }                       from './lib/corsOrigins.js';
import { initSocket }                                             from './lib/socketServer.js';
import { startAutoScraper }                                       from './lib/autoScraper.js';
import { startAllJobs }                                           from './lib/scheduler.js';
import { startKeepAlive }                                         from './lib/keepAlive.js';
import { verifyEmailTransport }                                   from './services/emailService.js';

async function main() {
  const dev  = process.env.NODE_ENV !== 'production';
  const PORT = parseInt(process.env.PORT || '3001', 10);

  // ── MongoDB setup ─────────────────────────────────────────────────────────
  const atlasUri = process.env.MONGODB_URI;
  const isAtlas  = atlasUri &&
    !atlasUri.includes('localhost') &&
    atlasUri.startsWith('mongodb');

  if (isAtlas) {
    console.log('[server] ✅ Using MongoDB Atlas (persistent storage)');
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('[server] ❌ MONGODB_URI not set in production. Set it in your host environment (e.g. Render → Environment).');
      process.exit(1);
    }
    if (atlasUri) {
      // Dev: an explicitly-set MONGODB_URI (even a local mongodb:// one) always wins
      console.log('[server] ✅ Using provided MONGODB_URI (dev mode)');
    } else {
      console.log('[server] No Atlas URI — starting in-memory MongoDB (dev mode, data resets on restart)...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongod.getUri();
      process.env.DB_NAME = process.env.DB_NAME || 'trendspy';
      console.log('[server] ✅ In-memory MongoDB ready');

      const stop = async () => { await mongod.stop(); process.exit(0); };
      process.on('SIGTERM', stop);
      process.on('SIGINT',  stop);
    }
  }

  // ── Seed ──────────────────────────────────────────────────────────────────
  try {
    const { seedAll } = await import('./lib/seedAll.js');
    await seedAll();
  } catch (err) {
    console.warn('[server] Seed warning:', err.message);
  }

  // ── Next.js ───────────────────────────────────────────────────────────────
  // fileURLToPath is required: plain URL.pathname breaks on Windows paths (leading '/' + %20-encoded spaces)
  const nextApp = next({ dev, dir: fileURLToPath(new URL('.', import.meta.url)) });
  const handle  = nextApp.getRequestHandler();
  await nextApp.prepare();

  // ── Express wrapper (CORS + rate limiting + structured logging) ───────────
  const server = express();

  // 0. CORS allow-list (FRONTEND_URL-driven; see lib/corsOrigins.js)
  server.use(corsAllowlist);

  // Ultra-light keep-alive endpoint for uptime pingers (Render free tier
  // anti-spin-down). Registered BEFORE request logging and rate limiting so
  // pings stay free and silent. No Next.js, no DB — instant response.
  server.get('/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

  // 1. Structured request logging (all routes)
  server.use(logRequest);

  // 2. Rate limiters — specific routes before the catch-all /api/ limiter
  server.use('/api/auth/login',            authLimiter);
  server.use('/api/auth/register',         authLimiter);
  server.use('/api/auth/forgot-password',  authLimiter);
  server.use('/api/ads/refresh',           scraperLimiter);
  server.use('/api/scraper',               scraperLimiter);
  server.use('/api/suppliers/scrape',      scraperLimiter);
  server.use('/api/ai',                    aiLimiter);
  // On-demand AI endpoints (vision/advice calls are costly — anti-spam)
  server.post('/api/ads/:id/identify',               aiLimiter);
  server.post('/api/products/:slug/sourcing-advice', aiLimiter);
  server.use('/api/',                      apiLimiter);

  // 3. Combined single-service deploys (repo-root Dockerfile) build the Vite
  //    frontend to ../frontend/dist — serve it BEFORE the Next catch-all.
  //    The folder simply does not exist in classic split-host/localhost dev
  //    setups (frontend served separately by Vite/Render static site), so this
  //    block auto-disables and nothing changes there.
  const distDir = fileURLToPath(new URL('../frontend/dist', import.meta.url));
  const hasDist = existsSync(join(distDir, 'index.html'));
  if (hasDist) {
    server.use(express.static(distDir, { maxAge: '1h' }));
    console.log('[server] ✅ Serving frontend build from ../frontend/dist (combined mode)');
  }

  // 3b. Hand everything else off to Next.js — except SPA page loads in
  //     combined mode, which belong to the frontend's index.html.
  server.all('*', (req, res) => {
    if (
      hasDist &&
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !req.path.startsWith('/socket.io') &&
      !req.path.startsWith('/_next') &&
      req.path !== '/ping' &&
      req.path !== '/health'
    ) {
      return res.sendFile(join(distDir, 'index.html'));
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // 4. Express-level error handler
  server.use(logError);

  // ── Single HTTP server: API + Socket.io on the same port ──────────────────
  const httpServer = http.createServer(server);
  initSocket(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] ✅ API + Socket.io running on http://0.0.0.0:${PORT}`);
    console.log(`[server] CORS allow-list: ${getAllowedOrigins().join(', ') || '(none — set FRONTEND_URL)'}`);

    // All 10 cron jobs. NOTE: instrumentation.js (Next) does NOT run under a
    // custom server, so the scheduler must be started from here — this is the
    // only reliable runtime path. startAllJobs is idempotent; the old
    // instrumentation call remains as a no-op fallback.
    startAllJobs();

    // Auto-scraper scheduler (enabled by default; AUTO_SCRAPER_ENABLED=false to opt out)
    startAutoScraper();

    // Anti-spin-down self-ping (no-op locally; active when RENDER_EXTERNAL_URL is set)
    startKeepAlive();

    // Non-blocking SMTP self-check — digests/alerts degrade loudly, not silently
    verifyEmailTransport();
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
