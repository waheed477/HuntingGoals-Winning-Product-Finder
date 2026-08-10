/**
 * Facebook Ad Library Scraper — delegates Puppeteer work to the Socket Server.
 *
 * Puppeteer cannot run inside Next.js (webpack bundling issues).
 * This module calls the socket server's /internal/scrape-fb-ads endpoint,
 * which runs Puppeteer in plain Node.js and returns normalised ad objects.
 *
 * Falls back to Facebook's unauthenticated JSON API if the socket server
 * is unavailable or returns no results.
 *
 * Falls back to existing DB ads if both live methods return nothing,
 * so the winning products page always has data to show.
 */

import axios from 'axios';
import { connectDB }     from '../lib/db.js';
import { ScrapedAd }     from '../models/index.js';
import { getRandomUserAgent } from '../lib/fakeUserAgent.js';
import { extractCity }   from '../lib/extractCity.js';
import { detectSeason }  from '../data/seasonalKeywords.js';

const FB_ADS_ASYNC    = 'https://www.facebook.com/ads/library/async/search_ads/';
const SOCKET_BASE_URL = process.env.SOCKET_INTERNAL_URL || 'http://localhost:3002';
const SOCKET_SECRET   = process.env.SOCKET_INTERNAL_SECRET || 'trendspy-socket-internal';

const SEARCH_TERMS = [
  { term: 'smart watch Pakistan',    category: 'Electronics' },
  { term: 'khaddar suit Pakistan',   category: 'Fashion'     },
  { term: 'air fryer Pakistan',      category: 'Home'        },
  { term: 'neck massager Pakistan',  category: 'Home'        },
  { term: 'beauty serum Pakistan',   category: 'Beauty'      },
  { term: 'skin whitening Pakistan', category: 'Beauty'      },
  { term: 'mobile cover Pakistan',   category: 'Electronics' },
  { term: 'hijab Pakistan',          category: 'Fashion'     },
  { term: 'kids tablet Pakistan',    category: 'Toys'        },
  { term: 'yoga mat Pakistan',       category: 'Sports'      },
];

function delay(minMs = 2000, maxMs = 4000) {
  return new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

function spendLevel(days) {
  if (days > 90) return 'high';
  if (days > 30) return 'medium';
  return 'low';
}

/**
 * Real Facebook ad IDs are 15-digit numeric strings from ad_archive_id.
 * Anything shorter, non-numeric, or clearly synthetic is rejected.
 */
function isValidAdId(id) {
  return typeof id === 'string' && /^[0-9]{10,}$/.test(id);
}

/** Build a working Facebook Ads Library deep-link — null when adId is invalid. */
function buildDirectUrl(adId) {
  return isValidAdId(adId) ? `https://www.facebook.com/ads/library/?id=${adId}` : null;
}

/** Tag an ad object with its detected season based on headline + description. */
function tagSeason(ad) {
  const text = [ad.headline, ad.description, ad.productName, ad.advertiserName].filter(Boolean).join(' ');
  return { ...ad, season: detectSeason(text) };
}

/**
 * Call the socket server's Puppeteer scrape endpoint.
 * Only works when FB_SESSION_COOKIE is set.
 */
async function scrapeViaSockerServer(searchTerm, category) {
  if (!process.env.FB_SESSION_COOKIE) {
    console.log(`[FB Ads] FB_SESSION_COOKIE not set — skipping Puppeteer for "${searchTerm}"`);
    return [];
  }

  try {
    const res = await axios.post(
      `${SOCKET_BASE_URL}/internal/scrape-fb-ads`,
      { searchTerm, category },
      { headers: { 'x-internal-secret': SOCKET_SECRET }, timeout: 90000 }
    );
    return res.data?.ads || [];
  } catch (err) {
    console.warn(`[FB Ads] Socket server scrape failed for "${searchTerm}": ${err.message}`);
    return [];
  }
}

/**
 * Unauthenticated JSON API fallback.
 */
async function tryJsonApi(searchTerm, category) {
  const params = new URLSearchParams({
    q: searchTerm, count: '30', active_status: 'all',
    ad_type: 'all', media_type: 'all', search_type: 'keyword_unordered', source: 'nav-header',
  });
  params.append('countries[0]', 'PK');

  try {
    const res = await axios.get(`${FB_ADS_ASYNC}?${params}`, {
      headers: {
        'User-Agent':       getRandomUserAgent(),
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
      const adId     = String(raw.adArchiveID || raw.ad_archive_id || '');
      const snapshot = raw.snapshot || raw.creative || {};
      const imageUrl = snapshot.images?.[0]?.original_image_url || '';
      const videoUrl = snapshot.videos?.[0]?.video_hd_url || '';
      const advName  = raw.pageName || raw.page_name || 'Unknown';
      const headline = (snapshot.title || snapshot.body?.text || raw.ad_creative_bodies?.[0] || '').slice(0, 300);
      const desc     = (snapshot.caption || raw.ad_creative_link_descriptions?.[0] || '').slice(0, 500);
      const ad = {
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
        scrapedAt:      new Date(),
      };
      return tagSeason(ad);
    // Only keep ads with a real numeric adId AND a headline
    }).filter((a) => isValidAdId(a.adId) && a.headline);
  } catch (err) {
    console.log(`[FB Ads JSON] Failed for "${searchTerm}": ${err.message}`);
    return [];
  }
}

/**
 * Upsert ads into MongoDB.
 * Guards: adId must be a real Facebook numeric ID (≥10 digits).
 * Ensures directUrl is always the canonical deep-link.
 */
async function saveAds(ads) {
  let savedNew = 0;
  let skipped  = 0;
  for (const ad of ads) {
    if (!isValidAdId(ad.adId)) {
      console.warn(`[FB Ads] Skipping ad with invalid ID: "${ad.adId}"`);
      skipped++;
      continue;
    }
    // Always (re-)compute directUrl so stale/wrong URLs get corrected on upsert
    const safeAd = { ...ad, directUrl: buildDirectUrl(ad.adId) };
    try {
      const result = await ScrapedAd.findOneAndUpdate(
        { adId: safeAd.adId },
        { $set: { ...safeAd, scrapedAt: new Date() }, $setOnInsert: { firstSeenAt: new Date() } },
        { upsert: true, new: false }
      );
      if (!result) savedNew++;
    } catch (err) {
      console.warn(`[FB Ads] Failed to save ad "${ad.adId}": ${err.message}`);
    }
  }
  if (skipped > 0) console.warn(`[FB Ads] Skipped ${skipped} ad(s) with invalid/fake IDs`);
  return savedNew;
}

/**
 * Main scraper — tries socket server (Puppeteer + cookie) then JSON API fallback.
 * Tags every ad with its detected season before saving to DB.
 */
async function fbAdsScraper({ searchTerm, category, platform = 'all' } = {}) {
  await connectDB();

  const targets = searchTerm
    ? [{ term: searchTerm, category: category || 'General' }]
    : SEARCH_TERMS;

  const allAds   = [];
  let totalSaved = 0;

  for (const target of targets) {
    console.log(`[FB Ads] Processing: "${target.term}" platform="${platform}"`);

    let ads = await scrapeViaSockerServer(target.term, target.category);

    if (platform !== 'all' && ads.length > 0) {
      ads = ads.filter((a) => a.platform === platform);
    }

    if (ads.length === 0) {
      await delay(500, 1000);
      ads = await tryJsonApi(target.term, target.category);
      if (platform !== 'all') {
        ads = ads.map((a) => ({ ...a, platform }));
      }
    }

    // Tag every ad with its season before saving
    ads = ads.map(tagSeason);

    console.log(`[FB Ads] Found ${ads.length} ads for "${target.term}"`);
    allAds.push(...ads);

    if (ads.length > 0) {
      totalSaved += await saveAds(ads);
    }

    await delay(2000, 4000);
  }

  // ── DB cache fallback ───────────────────────────────────────────────────────
  if (allAds.length === 0) {
    console.warn('[FB Ads] No live ads collected — serving from DB cache');
    const cached = await ScrapedAd.find({}).sort({ scrapedAt: -1 }).limit(100).lean();
    if (cached.length > 0) {
      console.log(`[FB Ads] DB cache hit: ${cached.length} stored ads`);
      return { success: true, ads: cached, totalFound: cached.length, savedNew: 0, fromCache: true };
    }
    console.warn('[FB Ads] DB cache empty — no data available');
  } else {
    console.log(`[FB Ads] Done. totalFound=${allAds.length} savedNew=${totalSaved}`);
  }

  return { success: true, ads: allAds, totalFound: allAds.length, savedNew: totalSaved };
}

export async function scrapeFacebookAds(searchTerm, category = null, platform = 'all') {
  return fbAdsScraper({ searchTerm, category, platform });
}

export async function countCompetitors(productName, city) {
  const query  = city ? `${productName} ${city}` : `${productName} Pakistan`;
  const result = await fbAdsScraper({ searchTerm: query, category: 'General' });
  const advertisers = [...new Set(result.ads.map((a) => a.advertiserName).filter(Boolean))];
  return { count: advertisers.length, advertisers: advertisers.slice(0, 10) };
}

export default fbAdsScraper;
