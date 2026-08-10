/**
 * Production Scraper Service
 *
 * Wraps fbAdsScraper with:
 *   - 5-minute in-memory cache (avoids hammering FB on every request)
 *   - Concurrent-scrape guard (only one live scrape at a time)
 *   - DB fallback  (always returns data even when FB blocks)
 *   - Auto-retry   (one retry after 3 s on failure)
 *   - Full logging
 */

import { connectDB } from '../lib/db.js';
import { ScrapedAd }  from '../models/index.js';
import { scrapeFacebookAds } from '../scrapers/fbAdsScraper.js';

const CACHE_TTL_MS   = 5  * 60 * 1000;   // 5 minutes
const DB_MAX_AGE_MS  = 7  * 24 * 60 * 60 * 1000; // 7 days — "recent enough" threshold
const RETRY_DELAY_MS = 3000;

// ── In-memory cache ─────────────────────────────────────────────────────────
const _cache = {
  data:      null,   // ScrapedAd documents
  fetchedAt: null,   // Date.now() timestamp
  loading:   false,  // concurrent-scrape guard
};

function isCacheWarm() {
  return (
    _cache.data &&
    _cache.fetchedAt &&
    Date.now() - _cache.fetchedAt < CACHE_TTL_MS
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function loadFromDB(limit = 100) {
  await connectDB();
  const ads = await ScrapedAd.find({})
    .sort({ scrapedAt: -1 })
    .limit(limit)
    .lean();
  return ads;
}

async function runScrape(category = null) {
  const searchTerm = category ? `${category} Pakistan` : null;
  const result     = await scrapeFacebookAds(searchTerm, category);
  return result;
}

async function withRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      console.warn(`[scraperService] Retrying after error: ${err.message}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get ads with full fallback chain:
 *   1. In-memory cache (< 5 min old)
 *   2. Live scrape (with retry)
 *   3. Database cache
 *   4. Empty array (never throws)
 *
 * @param {object}  options
 * @param {boolean} options.forceRefresh  Bypass memory cache
 * @param {string}  options.category      Optional category filter for scrape
 * @param {number}  options.limit         Max ads to return from DB fallback
 * @returns {Promise<Array>}
 */
export async function getAdsWithFallback(options = {}) {
  const { forceRefresh = false, category = null, limit = 100 } = options;

  // 1 ── In-memory cache hit
  if (!forceRefresh && isCacheWarm()) {
    console.log('[scraperService] Cache hit — returning in-memory ads');
    return _cache.data;
  }

  // 2 ── Concurrent-scrape guard
  if (_cache.loading) {
    console.log('[scraperService] Scrape already in-progress — waiting 5 s then serving cache');
    await new Promise((r) => setTimeout(r, 5000));
    return _cache.data || await loadFromDB(limit);
  }

  _cache.loading = true;
  console.log('[scraperService] Starting live scrape…');

  try {
    // 3 ── Live scrape with one automatic retry
    const result = await withRetry(() => runScrape(category));

    if (result?.success && Array.isArray(result.ads) && result.ads.length > 0) {
      console.log(`[scraperService] Live scrape succeeded — ${result.ads.length} ads`);
      _cache.data      = result.ads;
      _cache.fetchedAt = Date.now();
      _cache.loading   = false;
      return result.ads;
    }

    // 4 ── DB fallback
    console.warn('[scraperService] Live scrape returned 0 ads — falling back to DB');
    const dbAds = await loadFromDB(limit);

    if (dbAds.length > 0) {
      console.log(`[scraperService] DB fallback: ${dbAds.length} ads served`);
      _cache.data      = dbAds;
      _cache.fetchedAt = Date.now();
      _cache.loading   = false;
      return dbAds;
    }

    // 5 ── Nothing anywhere
    console.warn('[scraperService] DB is empty — returning []');
    _cache.loading = false;
    return [];

  } catch (err) {
    console.error('[scraperService] Scrape error:', err.message);

    // Always try DB before giving up
    try {
      const dbAds = await loadFromDB(limit);
      if (dbAds.length > 0) {
        console.log(`[scraperService] Error recovery: serving ${dbAds.length} DB ads`);
        _cache.data      = dbAds;
        _cache.fetchedAt = Date.now();
        _cache.loading   = false;
        return dbAds;
      }
    } catch (dbErr) {
      console.error('[scraperService] DB fallback also failed:', dbErr.message);
    }

    _cache.loading = false;
    return [];
  }
}

/**
 * Ensure the DB has at least some ads before computing winners.
 * If the DB is empty (or has only stale data), trigger a background scrape.
 * Non-blocking — returns immediately.
 */
export function ensureAdsExist() {
  connectDB().then(async () => {
    const count = await ScrapedAd.countDocuments({
      scrapedAt: { $gte: new Date(Date.now() - DB_MAX_AGE_MS) },
    });
    if (count === 0) {
      console.log('[scraperService] DB has no recent ads — triggering background scrape');
      getAdsWithFallback({ forceRefresh: true }).catch((e) =>
        console.error('[scraperService] background scrape error:', e.message)
      );
    }
  }).catch(() => {});
}

/**
 * Get scraper status for the health endpoint.
 */
export async function getScraperStatus() {
  await connectDB();
  const totalAds  = await ScrapedAd.countDocuments();
  const latest    = await ScrapedAd.findOne().sort({ scrapedAt: -1 }).lean();
  const recent    = latest ? Date.now() - new Date(latest.scrapedAt).getTime() : Infinity;
  const ageHours  = recent === Infinity ? null : Math.round(recent / 36000) / 100;

  return {
    totalAds,
    lastScraped:  latest?.scrapedAt || null,
    ageHours,
    hasCookie:    !!process.env.FB_SESSION_COOKIE,
    cacheWarm:    isCacheWarm(),
    cachedAds:    _cache.data?.length || 0,
    healthy:      totalAds > 0 && recent < DB_MAX_AGE_MS,
  };
}
