/**
 * Facebook Ad Library — live (Puppeteer) scraper.
 *
 * Migrated verbatim from the former standalone socket-server.js into the main
 * process (Socket.io is now attached to the same HTTP server, so there is no
 * second process to delegate this work to).
 *
 * Puppeteer launch failures are handled gracefully — every public function
 * returns [] instead of throwing, so a broken browser never crashes a job.
 */

import axios from 'axios';
import { getPuppeteerLaunchOptions } from './chromium.js';

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
  //   \"collated_results\\\":[{\\\"ad_archive_id\\\":\\\"...
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
        // Video ads carry a product preview frame — never drop it, the AI
        // identifier needs an image and video ads are our most common creative.
        const imageUrl    = images[0]?.original_image_url || images[0]?.url
                         || videos[0]?.video_preview_image_url || videos[0]?.preview_image_url || '';
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
    const stealth = (await import('puppeteer-extra-plugin-stealth')).default();
    pExtra.use(stealth);
    puppeteer = pExtra;
  } catch (err) {
    console.warn('[FB Scraper] puppeteer-extra not available:', err.message);
    return [];
  }

  let browser;
  try {
    browser = await puppeteer.launch(getPuppeteerLaunchOptions([
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
      '--lang=en-US,en',
    ]));

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie(...parseCookies(cookieString));

    // RAM/bandwidth saver: ad data arrives via GraphQL XHR responses, so the
    // page's images/fonts/media are pure overhead — block them (important on a
    // 512 MB instance). Scripts/XHR stay enabled, obviously.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const t = req.resourceType();
      if (t === 'image' || t === 'font' || t === 'media') {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });

    // ── Intercept FB GraphQL/XHR responses that carry ad data ─────────────
    // FB Ad Library loads ads via async XHR (not in the initial HTML).
    // We capture every facebook.com response whose body contains ad markers.
    const interceptedChunks = [];
    let candidateResponses = 0; // diagnostic: how many JSON-ish responses did FB send at all

    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('facebook.com')) return;
      // Only look at likely API/document responses
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json') && !ct.includes('javascript') && !ct.includes('text')) return;
      candidateResponses++;
      try {
        const text = await response.text();
        if (text.includes('collated_results') || text.includes('ad_archive_id') || text.includes('ad_library_id')) {
          interceptedChunks.push(text);
        }
      } catch { /* ignore */ }
    });

    const adLibUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=PK&locale=en_US&q=${encodeURIComponent(searchTerm)}&search_type=keyword_unordered`;
    console.log(`[FB Scraper] Navigating: "${searchTerm}"`);
    await page.goto(adLibUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Diagnostics: if FB bounced us to login/checkpoint (expired cookie or an
    // IP challenge), say so plainly — saves hours of blind debugging.
    const landedUrl   = page.url();
    const landedTitle = await page.title().catch(() => '');
    if (/checkpoint|login/i.test(landedUrl) || /log in|checkpoint/i.test(landedTitle)) {
      console.warn(`[FB Scraper] ⚠️  Landed on "${landedTitle}" (${landedUrl.slice(0, 80)}) — session cookie rejected or IP challenged; ads cannot load this way.`);
    }

    // Give React time to fire its initial fetch, then SCROLL — the Ad Library
    // lazy-loads result batches on scroll; without scrolling many GraphQL
    // responses never fire (a common cause of "0 ads" on server runs).
    await new Promise((r) => setTimeout(r, 5000));
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 2400)).catch(() => {});
      await new Promise((r) => setTimeout(r, 1800));
    }

    console.log(`[FB Scraper] Intercepted ${interceptedChunks.length} ad-data chunk(s) out of ${candidateResponses} candidate JSON response(s)`);

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
      // Keep the video preview frame too — without it video-only ads never get an image
      const imageUrl = snapshot.images?.[0]?.original_image_url
                    || snapshot.videos?.[0]?.video_preview_image_url
                    || snapshot.videos?.[0]?.preview_image_url || '';
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

/**
 * Scrape the FB Ad Library for a search term.
 * Order: official Ad Library API (FB_ACCESS_TOKEN) → authenticated Puppeteer
 * session → unauthenticated JSON endpoint. Never throws — returns [] on failure.
 *
 * Side effect (preserved from the old socket-server endpoint): when ads are
 * found, a `newAdsDetected` event is broadcast over the in-process Socket.io.
 */
export async function scrapeFbAds(searchTerm, category) {
  console.log(`[FB Scraper] Request: "${searchTerm}" category="${category}"`);

  let ads = [];

  // 1) Official Meta Ad Library API — works from datacenter IPs, no cookies,
  //    no Chromium. Preferred when FB_ACCESS_TOKEN is set.
  if (process.env.FB_ACCESS_TOKEN) {
    ads = await fetchFbAdsViaOfficialApi(searchTerm, category);
  }

  // 2) Authenticated Puppeteer session (local-style fallback)
  if (ads.length === 0) {
    ads = await scrapeFbAdsWithCookie(searchTerm, category);
  }

  // 3) Unauthenticated JSON API last-ditch fallback
  if (ads.length === 0) {
    console.log('[FB Scraper] Trying JSON API fallback…');
    ads = await tryJsonApiFallback(searchTerm, category);
  }

  if (ads.length > 0) {
    try {
      globalThis.__trendspyIO?.emit('newAdsDetected', { count: ads.length, category, searchTerm });
    } catch { /* broadcast is best-effort */ }
  }

  return ads;
}

/**
 * Official Meta Ad Library API — the sanctioned HTTPS path (graph.facebook.com
 * /ads_archive). Reliable from datacenter IPs; no cookies or Chromium needed.
 * Token errors (expired ~60-day user tokens, rate limits) log clearly and
 * return [] so the cookie/JSON fallbacks take over — the pipeline never dies.
 */
const ADLIB_FIELDS = [
  'id',
  'page_name',
  'ad_creative_bodies',
  'ad_creative_link_titles',
  'ad_creative_link_descriptions',
  'ad_delivery_start_time',
  'ad_delivery_stop_time',
  'publisher_platforms',
  'ad_snapshot_url',
].join(',');

// ─── Snapshot media resolver ────────────────────────────────────────────────
// The official API returns no direct image URL, but every ad's public
// snapshot page carries <meta property="og:image" …> (and og:video for video
// creatives). One lightweight GET per ad recovers the real creative media.

export function extractOgMedia(html) {
  if (typeof html !== 'string' || !html) return { image: '', video: '' };
  const pick = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
           || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
    return m ? m[1] : '';
  };
  return { image: pick('image'), video: pick('video') };
}

async function resolveSnapshotImages(ads) {
  const need = ads.filter((a) => a.snapshotUrl && !a.imageUrl).slice(0, 30);
  if (need.length === 0) return ads;

  let done = 0, failed = 0;
  for (const ad of need) {
    try {
      const res = await axios.get(ad.snapshotUrl, {
        timeout: 8000,
        responseType: 'text',
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (res.status === 200 && typeof res.data === 'string') {
        const { image, video } = extractOgMedia(res.data);
        if (image) ad.imageUrl = image;
        if (video) ad.videoUrl = video;
        if (image || video) { done++; } else { failed++; }
      } else { failed++; }
    } catch { failed++; }
    // polite pacing — ~3 ads/sec, keeps the run inside free-tier RAM
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`[FB API] snapshot images resolved for ${done}/${need.length} ad(s)${failed ? ` (${failed} snapshot page(s) gave no og:image)` : ''}`);
  return ads;
}

async function fetchFbAdsViaOfficialApi(searchTerm, category) {
  const params = new URLSearchParams({
    access_token:         process.env.FB_ACCESS_TOKEN,
    search_terms:         searchTerm,
    ad_reached_countries: "['PK']",
    ad_active_status:     'ALL',
    ad_type:              'ALL',
    fields:               ADLIB_FIELDS,
    limit:                '50',
  });

  try {
    const res  = await axios.get(`https://graph.facebook.com/v21.0/ads_archive?${params}`, {
      timeout: 25000, validateStatus: () => true,
    });
    const { data, error } = res.data || {};

    if (error) {
      const hint =
        error.code === 190              ? ' — token invalid/expired; regenerate FB_ACCESS_TOKEN (Graph API Explorer)' :
        [4, 17, 32, 613, 80004].includes(error.code) ? ' — rate limited; the next scheduled run will retry' : '';
      console.warn(`[FB API] "${searchTerm}" error ${error.code}: ${error.message}${hint}`);
      return [];
    }

    const rows = Array.isArray(data) ? data : [];
    console.log(`[FB API] "${searchTerm}" → ${rows.length} ad(s) via official Ad Library API`);

    const ads = rows.map((row) => {
      const adId      = String(row.id || '');
      const bodyText  = (row.ad_creative_bodies?.[0] || '').replace(/\n/g, ' ').trim().slice(0, 300);
      const title     = (row.ad_creative_link_titles?.[0] || '').slice(0, 300);
      const linkDesc  = (row.ad_creative_link_descriptions?.[0] || '').slice(0, 500);
      const headline  = bodyText || title || linkDesc;

      const startMs     = row.ad_delivery_start_time ? Date.parse(row.ad_delivery_start_time) : 0;
      const daysRunning = startMs ? Math.floor((Date.now() - startMs) / 86400000) : 0;
      const platforms   = (row.publisher_platforms || []).map((p) => String(p).toLowerCase());

      return {
        adId,
        directUrl:      buildDirectUrl(adId),
        advertiserName: row.page_name || 'Unknown',
        headline,
        description:    linkDesc,
        daysRunning,
        creativeType:   'image',            // refined below when og:video exists
        imageUrl:       '',                 // filled by resolveSnapshotImages()
        videoUrl:       '',
        snapshotUrl:    row.ad_snapshot_url || '', // URL embeds the OAuth token — never log it raw
        spendLevel:     spendLevel(daysRunning),
        platform:       platforms.length ? platforms.join(',') : 'facebook',
        category,
        city:           extractCity(headline, linkDesc, row.page_name),
        scrapedAt:      new Date().toISOString(),
      };
    }).filter((a) => isValidAdId(a.adId) && a.headline && a.headline.length >= 5);

    await resolveSnapshotImages(ads);
    for (const ad of ads) {
      if (ad.videoUrl && ad.creativeType === 'image') ad.creativeType = 'video';
      delete ad.snapshotUrl; // token-embedded helper — never persisted
    }
    return ads;
  } catch (err) {
    console.warn(`[FB API] "${searchTerm}" request failed: ${err.message}`);
    return [];
  }
}

export { isValidAdId, buildDirectUrl, extractCity };

// Registry for modules compiled inside Next.js webpack bundles (routes/jobs):
// they cannot import this file directly — Puppeteer must stay out of webpack's
// module graph — so they reach the scraper through this shared global handle.
globalThis.__trendspyScrapeFbAds = scrapeFbAds;
