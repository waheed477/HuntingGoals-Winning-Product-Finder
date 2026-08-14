/**
 * Auto Scraper Scheduler
 *
 * Migrated from the former standalone socket-server.js — now runs inside the
 * main server process. Jobs persist results by calling this app's own public
 * API over loopback (same behavior as before, just same-process).
 *
 * Enabled by default; set AUTO_SCRAPER_ENABLED=false to opt out.
 *
 * Status/trigger handles are registered on globalThis.__trendspyScheduler so
 * Next.js API routes (separate webpack module instances) can reach them.
 */

import axios from 'axios';
import cron from 'node-cron';
import { scrapeFbAds } from './fbLiveScraper.js';

// Loopback API — this same server, whatever PORT it bound to.
const SELF_API = () => `http://127.0.0.1:${process.env.PORT || 3001}`;

// ── Status tracking ──────────────────────────────────────────────────────────
const schedulerStatus = {
  enabled:     false,
  startedAt:   null,
  facebookAds: { lastRun: null, lastResult: null },
  daraz:       { lastRun: null, lastResult: null },
  olx:         { lastRun: null, lastResult: null },
  googleTrends:{ lastRun: null, lastResult: null },
  news:        { lastRun: null, lastResult: null },
  suppliers:   { lastRun: null, lastResult: null },
};

// ── Facebook Ads scheduler job ───────────────────────────────────────────────
// Calls the existing /api/ads/refresh endpoint for each category.
const FB_ADS_QUERIES = [
  { searchTerm: 'smart watch Pakistan',          category: 'Electronics' },
  { searchTerm: 'wireless earbuds Pakistan',     category: 'Electronics' },
  { searchTerm: 'mobile accessories Pakistan',   category: 'Electronics' },
  { searchTerm: 'handbag fashion Pakistan',      category: 'Fashion'     },
  { searchTerm: 'shoes sneakers Pakistan',       category: 'Fashion'     },
  { searchTerm: 'men kurta shalwar Pakistan',    category: 'Fashion'     },
  { searchTerm: 'skin care beauty Pakistan',     category: 'Beauty'      },
  { searchTerm: 'hair care products Pakistan',   category: 'Beauty'      },
  { searchTerm: 'home appliances Pakistan',      category: 'Home'        },
  { searchTerm: 'kitchen gadgets Pakistan',      category: 'Home'        },
  { searchTerm: 'sports equipment Pakistan',     category: 'Sports'      },
  { searchTerm: 'fitness gym accessories Pakistan', category: 'Sports'   },
];

// Overlap guard — a run in progress must never be re-entered (protects the
// single Render service from stacked scrapes if a previous run overruns).
let fbJobRunning = false;

export async function runFacebookAdsJob() {
  if (fbJobRunning) {
    console.log('[Scheduler] FB Ads job already running — skipping this tick.');
    return;
  }
  fbJobRunning = true;
  try {
    console.log('[Scheduler] FB Ads job starting...');
    let totalSaved = 0; let errors = 0;
    for (const q of FB_ADS_QUERIES) {
      try {
        const res = await axios.post(`${SELF_API()}/api/ads/refresh`, q, { timeout: 90000 });
        const saved = res.data?.savedNew || 0;
        totalSaved += saved;
        console.log(`[Scheduler]   FB ${q.category}: +${saved} new ads`);
      } catch (e) {
        errors++;
        console.warn(`[Scheduler]   FB ${q.category} error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    schedulerStatus.facebookAds = {
      lastRun:    new Date().toISOString(),
      lastResult: { totalSaved, errors },
    };
    try { globalThis.__trendspyIO?.emit('schedulerRan', { scraper: 'facebookAds', totalSaved, errors }); } catch { /* best-effort */ }
    console.log(`[Scheduler] FB Ads job done. saved=${totalSaved} errors=${errors}`);
  } finally {
    fbJobRunning = false;
  }
}

// ── Daraz scraper job ────────────────────────────────────────────────────────
// Scrapes Daraz trending products page via axios+cheerio and upserts via API.
async function runDarazJob() {
  console.log('[Scheduler] Daraz job starting...');
  try {
    const { load } = await import('cheerio');
    const CATEGORIES_DARAZ = ['smart-watches', 'mobile-phones', 'shoes', 'bags-luggage', 'skin-care'];
    let saved = 0;
    for (const cat of CATEGORIES_DARAZ) {
      try {
        const url = `https://www.daraz.pk/${cat}/?sort=popularity&ajax=true`;
        const res  = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 20000,
        });
        const $ = load(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
        const products = [];
        $('[data-qa-locator="product-item"],.product-item,.item').each((_, el) => {
          const name  = $(el).find('.title,.name,[class*="title"]').first().text().trim();
          const price = $(el).find('.price,.amount,[class*="price"]').first().text().trim().replace(/[^0-9]/g, '');
          const img   = $(el).find('img').first().attr('src') || '';
          if (name && name.length > 3) products.push({ name, price: parseInt(price||'0',10), img, platform: 'daraz', category: cat });
        });
        if (products.length > 0) {
          await axios.post(`${SELF_API()}/api/products/import`, { products, source: 'daraz' }, { timeout: 10000 }).catch(()=>{});
          saved += products.length;
        }
        await new Promise(r => setTimeout(r, 2000));
      } catch { /* skip category */ }
    }
    schedulerStatus.daraz = { lastRun: new Date().toISOString(), lastResult: { saved } };
    console.log(`[Scheduler] Daraz job done. products=${saved}`);
  } catch (e) {
    schedulerStatus.daraz = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] Daraz job failed:', e.message);
  }
}

// ── OLX scraper job ──────────────────────────────────────────────────────────
async function runOlxJob() {
  console.log('[Scheduler] OLX job starting...');
  try {
    const { load } = await import('cheerio');
    const OLX_QUERIES = ['smart watch', 'mobile phone', 'laptop', 'handbag', 'shoes'];
    let saved = 0;
    for (const q of OLX_QUERIES) {
      try {
        const url = `https://www.olx.com.pk/items/q-${encodeURIComponent(q.replace(/ /g,'-'))}`;
        const res  = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 20000,
        });
        const $ = load(res.data);
        const listings = [];
        $('[data-aut-id="itemBox"],.EIR5N,.IKo3_').each((_, el) => {
          const name  = $(el).find('[data-aut-id="itemTitle"],._2tW1I,.IKo3_').first().text().trim();
          const price = $(el).find('[data-aut-id="itemPrice"],._1zgtX').first().text().trim().replace(/[^0-9]/g,'');
          if (name && name.length > 3) listings.push({ name, price: parseInt(price||'0',10), platform: 'olx', query: q });
        });
        saved += listings.length;
        await new Promise(r => setTimeout(r, 2000));
      } catch { /* skip query */ }
    }
    schedulerStatus.olx = { lastRun: new Date().toISOString(), lastResult: { saved } };
    console.log(`[Scheduler] OLX job done. listings=${saved}`);
  } catch (e) {
    schedulerStatus.olx = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] OLX job failed:', e.message);
  }
}

// ── Google Trends job ────────────────────────────────────────────────────────
async function runGoogleTrendsJob() {
  console.log('[Scheduler] Google Trends job starting...');
  try {
    const googleTrends = (await import('google-trends-api')).default;
    const TREND_QUERIES = ['smart watch Pakistan','mobile phone Pakistan','fashion Pakistan','beauty products Pakistan','electronics Pakistan'];
    const results = [];
    for (const q of TREND_QUERIES) {
      try {
        const raw  = await googleTrends.interestOverTime({ keyword: q, geo: 'PK', startTime: new Date(Date.now() - 30*24*3600*1000) });
        const data = JSON.parse(raw);
        const pts  = data.default?.timelineData || [];
        const avg  = pts.length ? Math.round(pts.reduce((s,p) => s + (p.value?.[0]||0), 0) / pts.length) : 0;
        results.push({ query: q, avgInterest: avg, fetchedAt: new Date().toISOString() });
      } catch { /* skip */ }
      await new Promise(r => setTimeout(r, 1500));
    }
    await axios.post(`${SELF_API()}/api/trends/import`, { trends: results }, { timeout: 10000 }).catch(()=>{});
    schedulerStatus.googleTrends = { lastRun: new Date().toISOString(), lastResult: { trends: results.length } };
    console.log(`[Scheduler] Google Trends job done. queries=${results.length}`);
  } catch (e) {
    schedulerStatus.googleTrends = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] Google Trends job failed:', e.message);
  }
}

// ── News scraper job (Dawn + Geo RSS) ────────────────────────────────────────
async function runNewsJob() {
  console.log('[Scheduler] News job starting...');
  try {
    const { load } = await import('cheerio');
    const FEEDS = [
      { url: 'https://www.dawn.com/feeds/home', source: 'Dawn' },
      { url: 'https://www.geo.tv/rss/1/1',      source: 'Geo'  },
    ];
    let articles = 0;
    for (const feed of FEEDS) {
      try {
        const res = await axios.get(feed.url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $   = load(res.data, { xmlMode: true });
        $('item').each((_, el) => {
          const title = $(el).find('title').text().trim();
          if (title && (title.toLowerCase().includes('product') || title.toLowerCase().includes('business') || title.toLowerCase().includes('tech') || title.toLowerCase().includes('ecommerce') || title.toLowerCase().includes('daraz'))) {
            articles++;
          }
        });
      } catch { /* skip feed */ }
    }
    schedulerStatus.news = { lastRun: new Date().toISOString(), lastResult: { articles } };
    console.log(`[Scheduler] News job done. relevant articles=${articles}`);
  } catch (e) {
    schedulerStatus.news = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] News job failed:', e.message);
  }
}

// ── Suppliers job ────────────────────────────────────────────────────────────
async function runSuppliersJob() {
  console.log('[Scheduler] Suppliers job starting...');
  try {
    await axios.post(`${SELF_API()}/api/suppliers/refresh`, {}, { timeout: 30000 }).catch(()=>{});
    schedulerStatus.suppliers = { lastRun: new Date().toISOString(), lastResult: { triggered: true } };
    console.log('[Scheduler] Suppliers job done.');
  } catch (e) {
    schedulerStatus.suppliers = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] Suppliers job failed:', e.message);
  }
}

// ── Manual trigger map ───────────────────────────────────────────────────────
const JOB_MAP = {
  facebookAds:  runFacebookAdsJob,
  daraz:        runDarazJob,
  olx:          runOlxJob,
  googleTrends: runGoogleTrendsJob,
  news:         runNewsJob,
  suppliers:    runSuppliersJob,
};

export function triggerAutoScraper(scraper) {
  const job = JOB_MAP[scraper];
  if (!job) return null;

  // Concurrency guard: a manual trigger while a scrape is already in flight
  // (e.g. a cron job running Chromium) would stack two heavy scrapes on a
  // 512 MB instance → OOM/segfault (exit 139) and a 502 for the caller.
  // Skip politely instead; the next cron run covers the data.
  if (globalThis.__hgScrapeBusy) {
    console.log(`[Scheduler] Manual trigger "${scraper}" skipped — another scrape is already running`);
    return scraper;
  }

  globalThis.__hgScrapeBusy = true;
  // Fire-and-forget (same semantics as the old /scheduler/trigger endpoint)
  job()
    .catch((e) => console.error(`[Scheduler] Manual trigger "${scraper}" failed:`, e.message))
    .finally(() => { globalThis.__hgScrapeBusy = false });
  return scraper;
}

// ── Start all cron jobs ──────────────────────────────────────────────────────
// Times are staggered a few minutes past the jobs/* crons (which fire on the
// hour) so Puppeteer-heavy jobs never all launch at once.
function startScheduler() {
  schedulerStatus.enabled   = true;
  schedulerStatus.startedAt = new Date().toISOString();

  // FB Ads — every 6 hours (23 past; scrapeJob runs at :00, competitor at :13)
  cron.schedule('23 */6 * * *', () => { runFacebookAdsJob().catch(console.error); });

  // Daraz + OLX — every 12 hours (2:27 AM & 2:27 PM)
  cron.schedule('27 2,14 * * *', () => {
    runDarazJob().catch(console.error);
    runOlxJob().catch(console.error);
  });

  // Google Trends + News — daily at 3:33 AM (digest runs at 3:00)
  cron.schedule('33 3 * * *', () => {
    runGoogleTrendsJob().catch(console.error);
    runNewsJob().catch(console.error);
  });

  // Suppliers — weekly, Sunday at 4:41 AM
  cron.schedule('41 4 * * 0', () => { runSuppliersJob().catch(console.error); });

  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  TrendSpy Auto Scraper Scheduler — ACTIVE        ║
  ╠═══════════════════════════════════════════════════╣
  ║  Facebook Ads    every 6 hours  (:23)            ║
  ║  Daraz + OLX     every 12 hours (2:27 / 14:27)   ║
  ║  Google Trends   daily at 3:33 AM                ║
  ║  News            daily at 3:33 AM                ║
  ║  Suppliers       weekly (Sunday 4:41 AM)         ║
  ╚═══════════════════════════════════════════════════╝`);

  // Run FB Ads shortly after startup so the DB has fresh data right away
  setTimeout(() => runFacebookAdsJob().catch(console.error), 10_000);
}

let started = false;

export function startAutoScraper() {
  if (started) return;
  started = true;

  if (process.env.AUTO_SCRAPER_ENABLED === 'false') {
    console.log('[Scheduler] Auto-scraper disabled via AUTO_SCRAPER_ENABLED=false.');
    return;
  }
  startScheduler();
}

// ── Status / introspection (kept compatible with the old HTTP endpoints) ─────
export function getSchedulerStatus() {
  return schedulerStatus;
}

export function getSchedulerNextRuns() {
  const now = new Date();
  const nextHour = (h, m = 0) => {
    const d = new Date(now);
    d.setMinutes(m, 0, 0);
    const cur = d.getHours();
    const diff = ((h - cur) % 24 + 24) % 24 || 24;
    d.setHours(cur + diff);
    return d.toISOString();
  };
  const nextMulti = (hours, m) => hours.map((h) => nextHour(h, m)).sort()[0];
  return {
    facebookAds:   nextMulti([0, 6, 12, 18], 23),
    darazOlx:      nextMulti([2, 14], 27),
    dailyScrapers: nextHour(3, 33),
    suppliers:     (() => { const d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(4,41,0,0); return d.toISOString(); })(),
  };
}

// Registry for Next.js API routes (they get their own webpack-copy of modules,
// so globalThis is the only reliable shared reference).
globalThis.__trendspyScheduler = {
  trigger:          (name) => triggerAutoScraper(name),
  runFacebookAdsJob: () => runFacebookAdsJob().catch((e) => console.error('[Scheduler] run-fb-job:', e.message)),
  getStatus:        () => schedulerStatus,
  getNextRuns:      () => getSchedulerNextRuns(),
  isEnabled:        () => schedulerStatus.enabled,
};
