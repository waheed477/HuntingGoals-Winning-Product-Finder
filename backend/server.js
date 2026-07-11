import { parse }  from 'url';
import express    from 'express';
import next       from 'next';
import { logRequest, logError }                                   from './middleware/logger.js';
import { apiLimiter, authLimiter, scraperLimiter, aiLimiter }     from './middleware/rateLimit.js';

async function main() {
  const dev = process.env.NODE_ENV !== 'production';

  // ── MongoDB setup ─────────────────────────────────────────────────────────
  const atlasUri = process.env.MONGODB_URI;
  const isAtlas  = atlasUri &&
    !atlasUri.includes('localhost') &&
    atlasUri.startsWith('mongodb');

  if (isAtlas) {
    console.log('[server] ✅ Using MongoDB Atlas (persistent storage)');
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('[server] ❌ MONGODB_URI not set in production. Set it in Replit Secrets.');
      process.exit(1);
    }
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

  // ── Seed ──────────────────────────────────────────────────────────────────
  try {
    const { seedAll } = await import('./lib/seedAll.js');
    await seedAll();
  } catch (err) {
    console.warn('[server] Seed warning:', err.message);
  }

  // ── Next.js ───────────────────────────────────────────────────────────────
  const nextApp = next({ dev, dir: new URL('.', import.meta.url).pathname });
  const handle  = nextApp.getRequestHandler();
  await nextApp.prepare();

  // ── Express wrapper (rate limiting + structured logging) ──────────────────
  const server = express();

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
  server.use('/api/',                      apiLimiter);

  // 3. Hand everything off to Next.js
  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // 4. Express-level error handler
  server.use(logError);

  server.listen(3001, '0.0.0.0', () => {
    console.log('[server] ✅ Next.js running on http://localhost:3001');
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
