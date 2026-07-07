/**
 * TrendSpy Socket.io Server
 * Standalone Express + Socket.io server on port 3002.
 * Handles real-time product score updates, user alerts,
 * and Facebook Ad Library scraping (Puppeteer lives here,
 * away from Next.js webpack bundling).
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import cron from 'node-cron';

// ─── City detection ───────────────────────────────────────────────────────────
const CITY_PATTERNS = [
  { name: 'Karachi',    re: /\bkarachi\b/i     },
  { name: 'Lahore',     re: /\blahore\b/i      },
  { name: 'Islamabad',  re: /\bislamabad\b/i   },
  { name: 'Rawalpindi', re: /\brawalpindi\b|\brwp\b/i },
  { name: 'Faisalabad', re: /\bfaisalabad\b|\bfsd\b/i },
  { name: 'Multan',     re: /\bmultan\b/i      },
  { name: 'Peshawar',   re: /\bpeshawar\b/i    },
  { name: 'Quetta',     re: /\bquetta\b/i      },
  { name: 'Sialkot',    re: /\bsialkot\b/i     },
  { name: 'Gujranwala', re: /\bgujranwala\b/i  },
];

function extractCity(...texts) {
  const combined = texts.filter(Boolean).join(' ');
  for (const { name, re } of CITY_PATTERNS) {
    if (re.test(combined)) return name;
  }
  return null;
}

// ─── Ad ID validation ─────────────────────────────────────────────────────────
// Real Facebook ad_archive_id values are 10-20 digit numeric strings.
// Anything shorter, non-numeric, or clearly synthetic is rejected.
function isValidAdId(id) {
  return typeof id === 'string' && /^[0-9]{10,}$/.test(id);
}

function buildDirectUrl(adId) {
  return isValidAdId(adId) ? `https://www.facebook.com/ads/library/?id=${adId}` : null;
}

// ─── Ad Extraction Helper (Node.js, not browser) ─────────────────────────────
function extractAdsFromHtml(html) {
  const results = [];
  const seenIds = new Set();

  // page.content() serialises <script> tag contents with escaped quotes:
  //   "collated_results\":[{\"ad_archive_id\":\"...
  // We need to find that escaped key, grab the raw JSON array string,
  // unescape it, then JSON.parse it.

  // Search for both escaped (\") and unescaped (") forms.
  const MARKERS = ['\\"collated_results\\"', '"collated_results"'];

  for (const MARKER of MARKERS) {
    let searchPos = 0;
    while (true) {
      const keyIdx = html.indexOf(MARKER, searchPos);
      if (keyIdx < 0) break;
      searchPos = keyIdx + 1;

      // Find the '[' that immediately follows the colon after the key
      const colonIdx = html.indexOf(':', keyIdx + MARKER.length);
      if (colonIdx < 0 || colonIdx > keyIdx + MARKER.length + 5) continue;
      const arrStart = html.indexOf('[', colonIdx);
      if (arrStart < 0 || arrStart > colonIdx + 5) continue;

      // Bracket counter to find the matching ']'.
      // Works for both escaped and unescaped forms because '[' and ']'
      // characters themselves are never escaped in this JSON-in-HTML context.
      let depth = 0, arrEnd = -1;
      for (let i = arrStart; i < html.length; i++) {
        if (html[i] === '[') depth++;
        else if (html[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
      }
      if (arrEnd < 0) continue;

      let arrStr = html.slice(arrStart, arrEnd + 1);

      // If quotes are backslash-escaped (the serialised-HTML form), unescape them.
      if (MARKER.startsWith('\\"')) {
        arrStr = arrStr.replace(/\\"/g, '"').replace(/\\\//g, '/');
      }

      let arr;
      try { arr = JSON.parse(arrStr); } catch { continue; }
      if (!Array.isArray(arr)) continue;

      for (const item of arr) {
        const adId = String(item.ad_archive_id || item.adArchiveID || '');
        if (!isValidAdId(adId) || seenIds.has(adId)) {
          if (adId && !isValidAdId(adId)) console.warn(`[FB Scraper] Skipping non-numeric adId: "${adId}"`);
          continue;
        }
        seenIds.add(adId);

        const snap        = item.snapshot || {};
        const page_name   = item.page_name || snap.page_name || snap.branded_content?.page_name || 'Unknown';
        const bodyText    = snap.body?.text || snap.caption || '';
        const title       = snap.title || snap.link_title || '';
        const linkDesc    = snap.link_description || '';
        const headline    = (bodyText || title || linkDesc).replace(/\n/g, ' ').trim().slice(0, 300);
        if (!headline || headline.length < 5) continue;

        const startTs     = item.start_date || snap.start_date || 0;
        const daysRunning = startTs ? Math.floor((Date.now() / 1000 - startTs) / 86400) : 0;

        const images      = snap.images || [];
        const videos      = snap.videos || [];
        const cards       = snap.cards  || [];
        const imageUrl    = images[0]?.original_image_url || images[0]?.url || '';
        const videoUrl    = videos[0]?.video_hd_url || videos[0]?.url || '';
        const creativeType = videos.length > 0 ? 'video' : (cards.length > 1 || images.length > 1 ? 'carousel' : 'image');

        results.push({
          adId,
          directUrl:      buildDirectUrl(adId),
          advertiserName: page_name,
          headline,
          description:    linkDesc || '',
          daysRunning,
          creativeType,
          imageUrl,
          videoUrl,
          platform:       'facebook',
          city:           extractCity(headline, linkDesc, page_name),
        });
      }
    }
  }
  return results;
}

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const SOCKET_PORT   = parseInt(process.env.SOCKET_PORT || '3002', 10);
const SOCKET_SECRET = (() => {
  if (process.env.SOCKET_INTERNAL_SECRET) return process.env.SOCKET_INTERNAL_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.error('[socket] ❌ SOCKET_INTERNAL_SECRET must be set in production. Add it to Replit Secrets.');
    process.exit(1);
  }
  console.warn('[socket] ⚠️  SOCKET_INTERNAL_SECRET not set — using dev default. Set it in Replit Secrets for production.');
  return 'trendspy-socket-internal';
})();

// In-memory map: socketId → { userId, socketId, connectedAt }
const connectedUsers = new Map();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Authentication Middleware ───────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.email  = decoded.email;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

// ─── Connection Handlers ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  connectedUsers.set(socket.id, {
    userId:      socket.userId,
    socketId:    socket.id,
    connectedAt: new Date(),
  });

  console.log(`[Socket] Connected: userId=${socket.userId} socketId=${socket.id} total=${connectedUsers.size}`);
  socket.join(`user:${socket.userId}`);

  socket.on('subscribe', ({ productIds = [] }) => {
    productIds.forEach((id) => socket.join(`product:${id}`));
    console.log(`[Socket] userId=${socket.userId} subscribed to ${productIds.length} product(s)`);
  });

  socket.on('unsubscribe', ({ productIds = [] }) => {
    productIds.forEach((id) => socket.leave(`product:${id}`));
  });

  socket.on('disconnect', (reason) => {
    connectedUsers.delete(socket.id);
    console.log(`[Socket] Disconnected: userId=${socket.userId} reason=${reason} total=${connectedUsers.size}`);
  });
});

// ─── Internal Emit API ───────────────────────────────────────────────────────
app.post('/internal/emit', (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== SOCKET_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { event, data, userId, productId } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });

  if (userId)       io.to(`user:${userId}`).emit(event, data);
  else if (productId) io.to(`product:${productId}`).emit(event, data);
  else              io.emit(event, data);

  res.json({ success: true, connectedClients: io.engine.clientsCount });
});

// ─── Status Endpoint ─────────────────────────────────────────────────────────
app.get('/socket/status', (req, res) => {
  res.json({
    status:  'online',
    clients: io.engine.clientsCount,
    users:   connectedUsers.size,
    uptime:  process.uptime(),
  });
});

// ─── Facebook Ad Library Scraper Endpoint ────────────────────────────────────
// Puppeteer lives here (plain Node.js) — Next.js calls this via HTTP.
// Protected by the same internal secret.

function parseCookies(cookieString) {
  return cookieString.split(';').map((part) => {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) return null;
    const name  = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    return { name, value, domain: '.facebook.com', path: '/', httpOnly: false, secure: true };
  }).filter(Boolean);
}

function spendLevel(days) {
  if (days > 90) return 'high';
  if (days > 30) return 'medium';
  return 'low';
}

async function scrapeFbAdsWithCookie(searchTerm, category) {
  const cookieString = process.env.FB_SESSION_COOKIE;
  if (!cookieString) {
    console.log('[FB Scraper] FB_SESSION_COOKIE not set');
    return [];
  }

  let puppeteer;
  try {
    const pExtra  = (await import('puppeteer-extra')).default;
    const stealth = (await import('puppeteer-extra-plugin-stealth')).default;
    pExtra.use(stealth());
    puppeteer = pExtra;
  } catch (err) {
    console.warn('[FB Scraper] puppeteer-extra not available:', err.message);
    return [];
  }

  let browser;
  try {
    const executablePath = process.env.CHROMIUM_PATH
      || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
        '--lang=en-US,en',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie(...parseCookies(cookieString));

    // ── Intercept FB GraphQL/XHR responses that carry ad data ─────────────
    // FB Ad Library loads ads via async XHR (not in the initial HTML).
    // We intercept every response whose body contains "collated_results".
    const interceptedChunks = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('facebook.com')) return;
      // Only look at likely API/document responses
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json') && !ct.includes('javascript') && !ct.includes('text')) return;
      try {
        const text = await response.text();
        if (text.includes('collated_results') || text.includes('ad_archive_id')) {
          interceptedChunks.push(text);
        }
      } catch { /* ignore */ }
    });

    const adLibUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=PK&q=${encodeURIComponent(searchTerm)}&search_type=keyword_unordered`;
    console.log(`[FB Scraper] Navigating: "${searchTerm}"`);
    await page.goto(adLibUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Give React time to fire its initial data fetch
    await new Promise((r) => setTimeout(r, 4000));

    console.log(`[FB Scraper] Intercepted ${interceptedChunks.length} response chunk(s) containing ad data`);

    // Extract ads from every intercepted chunk
    const seenIds = new Set();
    const ads = [];
    for (const chunk of interceptedChunks) {
      for (const ad of extractAdsFromHtml(chunk)) {
        if (!seenIds.has(ad.adId)) {
          seenIds.add(ad.adId);
          ads.push(ad);
        }
      }
    }

    console.log(`[FB Scraper] Extracted ${ads.length} ads for "${searchTerm}"`);
    return ads.map((a) => ({
      ...a,
      spendLevel: spendLevel(a.daysRunning),
      category,
      scrapedAt:  new Date().toISOString(),
    }));

  } catch (err) {
    console.error(`[FB Scraper] Puppeteer error: ${err.message}`);
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function tryJsonApiFallback(searchTerm, category) {
  const params = new URLSearchParams({
    q: searchTerm, count: '30', active_status: 'all',
    ad_type: 'all', media_type: 'all', search_type: 'keyword_unordered', source: 'nav-header',
  });
  params.append('countries[0]', 'PK');

  try {
    const res = await axios.get(`https://www.facebook.com/ads/library/async/search_ads/?${params}`, {
      headers: {
        'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':           'application/json, text/javascript, */*; q=0.01',
        'Referer':          'https://www.facebook.com/ads/library/',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 20000, responseType: 'text', validateStatus: () => true,
    });

    if (res.status !== 200) return [];
    let text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    text = text.replace(/^for\s*\(;;\s*\);/, '').trim();
    if (!text.startsWith('{') && !text.startsWith('[')) return [];

    const json   = JSON.parse(text);
    const rawAds = json.payload?.results || json.data?.ad_archive_main_table_data || json.results || [];
    if (!Array.isArray(rawAds) || rawAds.length === 0) return [];

    return rawAds.map((raw) => {
      // Never use raw.id — it can be a non-numeric internal React key
      const adId     = String(raw.adArchiveID || raw.ad_archive_id || '');
      const snapshot = raw.snapshot || raw.creative || {};
      const imageUrl = snapshot.images?.[0]?.original_image_url || '';
      const videoUrl = snapshot.videos?.[0]?.video_hd_url || '';
      const advName  = raw.pageName || raw.page_name || 'Unknown';
      const headline = (snapshot.title || snapshot.body?.text || raw.ad_creative_bodies?.[0] || '').slice(0, 300);
      const desc     = (snapshot.caption || raw.ad_creative_link_descriptions?.[0] || '').slice(0, 500);
      return {
        adId,
        directUrl:      buildDirectUrl(adId),
        advertiserName: advName,
        headline,
        description:    desc,
        daysRunning:    0,
        creativeType:   videoUrl ? 'video' : (snapshot.images?.length > 1 ? 'carousel' : 'image'),
        imageUrl, videoUrl,
        spendLevel:     'low',
        platform:       'facebook',
        category,
        city:           extractCity(headline, desc, advName),
        scrapedAt:      new Date().toISOString(),
      };
    // Only keep ads with real 10+ digit numeric adIds AND a headline
    }).filter((a) => isValidAdId(a.adId) && a.headline);
  } catch {
    return [];
  }
}

app.post('/internal/scrape-fb-ads', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== SOCKET_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { searchTerm = 'smart watch Pakistan', category = 'Electronics' } = req.body;
  console.log(`[FB Scraper] Request: "${searchTerm}" category="${category}"`);

  try {
    let ads = await scrapeFbAdsWithCookie(searchTerm, category);

    if (ads.length === 0) {
      console.log('[FB Scraper] Trying JSON API fallback…');
      ads = await tryJsonApiFallback(searchTerm, category);
    }

    // Broadcast new ads via socket if any found
    if (ads.length > 0) {
      io.emit('newAdsDetected', { count: ads.length, category, searchTerm });
    }

    res.json({ success: true, ads, totalFound: ads.length });
  } catch (err) {
    console.error('[FB Scraper] Endpoint error:', err.message);
    res.status(500).json({ success: false, error: err.message, ads: [], totalFound: 0 });
  }
});

// ─── Trigger full FB Ads job (async — returns immediately) ───────────────────
app.post('/internal/run-fb-job', (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== SOCKET_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ success: true, message: 'FB Ads scrape job started' });
  runFacebookAdsJob().catch((e) =>
    console.error('[internal/run-fb-job]', e.message)
  );
});

// ─── Exported Helpers (same process use) ─────────────────────────────────────
export function emitToUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAll(event, data) {
  io.emit(event, data);
}

export function getConnectedUsers() {
  return connectedUsers.size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO SCRAPER SCHEDULER
// Runs inside socket-server.js (plain Node.js) — avoids Next.js webpack issues.
// All scrapers POST to the Next.js backend to persist data in MongoDB.
// ═══════════════════════════════════════════════════════════════════════════════

const NEXT_API  = process.env.NEXT_INTERNAL_URL  || 'http://localhost:3001';
const INT_SEC   = SOCKET_SECRET;

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
// Calls the existing /api/ads/refresh endpoint on Next.js for each category.
const FB_ADS_QUERIES = [
  { searchTerm: 'smart watch Pakistan',          category: 'Electronics' },
  { searchTerm: 'wireless earbuds Pakistan',     category: 'Electronics' },
  { searchTerm: 'mobile accessories Pakistan',   category: 'Electronics' },
  { searchTerm: 'handbag fashion Pakistan',      category: 'Fashion'     },
  { searchTerm: 'shoes sneakers Pakistan',       category: 'Fashion'     },
  { searchTerm: 'skin care beauty Pakistan',     category: 'Beauty'      },
  { searchTerm: 'home appliances Pakistan',      category: 'Home'        },
  { searchTerm: 'sports equipment Pakistan',     category: 'Sports'      },
];

async function runFacebookAdsJob() {
  console.log('[Scheduler] FB Ads job starting...');
  let totalSaved = 0; let errors = 0;
  for (const q of FB_ADS_QUERIES) {
    try {
      const res = await axios.post(`${NEXT_API}/api/ads/refresh`, q, { timeout: 90000 });
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
  io.emit('schedulerRan', { scraper: 'facebookAds', totalSaved, errors });
  console.log(`[Scheduler] FB Ads job done. saved=${totalSaved} errors=${errors}`);
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
          await axios.post(`${NEXT_API}/api/products/import`, { products, source: 'daraz' }, { timeout: 10000 }).catch(()=>{});
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
    await axios.post(`${NEXT_API}/api/trends/import`, { trends: results }, { timeout: 10000 }).catch(()=>{});
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
    await axios.post(`${NEXT_API}/api/suppliers/refresh`, {}, { timeout: 30000 }).catch(()=>{});
    schedulerStatus.suppliers = { lastRun: new Date().toISOString(), lastResult: { triggered: true } };
    console.log('[Scheduler] Suppliers job done.');
  } catch (e) {
    schedulerStatus.suppliers = { lastRun: new Date().toISOString(), lastResult: { error: e.message } };
    console.warn('[Scheduler] Suppliers job failed:', e.message);
  }
}

// ── Start all cron jobs ──────────────────────────────────────────────────────
function startScheduler() {
  schedulerStatus.enabled   = true;
  schedulerStatus.startedAt = new Date().toISOString();

  // FB Ads — every 6 hours
  cron.schedule('0 */6 * * *', () => { runFacebookAdsJob().catch(console.error); });

  // Daraz + OLX — every 12 hours (2 AM & 2 PM)
  cron.schedule('0 2,14 * * *', () => {
    runDarazJob().catch(console.error);
    runOlxJob().catch(console.error);
  });

  // Google Trends + News — daily at 3 AM
  cron.schedule('0 3 * * *', () => {
    runGoogleTrendsJob().catch(console.error);
    runNewsJob().catch(console.error);
  });

  // Suppliers — weekly, Sunday at 4 AM
  cron.schedule('0 4 * * 0', () => { runSuppliersJob().catch(console.error); });

  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  TrendSpy Auto Scraper Scheduler — ACTIVE        ║
  ╠═══════════════════════════════════════════════════╣
  ║  Facebook Ads    every 6 hours                   ║
  ║  Daraz + OLX     every 12 hours (2 AM / 2 PM)   ║
  ║  Google Trends   daily at 3 AM                   ║
  ║  News            daily at 3 AM                   ║
  ║  Suppliers       weekly (Sunday 4 AM)            ║
  ╚═══════════════════════════════════════════════════╝`);

  // Run FB Ads immediately on startup so the DB has fresh data right away
  setTimeout(() => runFacebookAdsJob().catch(console.error), 10_000);
}

// ── Scheduler status endpoint ────────────────────────────────────────────────
app.get('/scheduler/status', (req, res) => {
  res.json({
    success: true,
    scheduler: schedulerStatus,
    nextRuns:  buildNextRuns(),
  });
});

// ── Manual trigger endpoint ───────────────────────────────────────────────────
app.post('/scheduler/trigger', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== SOCKET_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const { scraper } = req.body;
  const JOB_MAP = {
    facebookAds:  runFacebookAdsJob,
    daraz:        runDarazJob,
    olx:          runOlxJob,
    googleTrends: runGoogleTrendsJob,
    news:         runNewsJob,
    suppliers:    runSuppliersJob,
  };

  const job = JOB_MAP[scraper];
  if (!job) return res.status(400).json({ error: `Unknown scraper: ${scraper}. Valid: ${Object.keys(JOB_MAP).join(', ')}` });

  res.json({ success: true, message: `${scraper} job triggered` });
  job().catch(console.error);
});

function buildNextRuns() {
  const now = new Date();
  const nextHour = (h) => {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    const cur = d.getHours();
    const diff = ((h - cur) % 24 + 24) % 24 || 24;
    d.setHours(cur + diff);
    return d.toISOString();
  };
  const nextMulti = (hours) => hours.map(nextHour).sort()[0];
  return {
    facebookAds:  nextMulti([0, 6, 12, 18]),
    darazOlx:     nextMulti([2, 14]),
    dailyScrapers: nextHour(3),
    suppliers:    (() => { const d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(4,0,0,0); return d.toISOString(); })(),
  };
}

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(SOCKET_PORT, '0.0.0.0', () => {
  console.log(`[Socket] Server running on port ${SOCKET_PORT}`);
  if (process.env.AUTO_SCRAPER_ENABLED === 'true') {
    startScheduler();
  } else {
    console.log('[Scheduler] Auto-scraper disabled. Set AUTO_SCRAPER_ENABLED=true to enable.');
  }
});

export default io;
