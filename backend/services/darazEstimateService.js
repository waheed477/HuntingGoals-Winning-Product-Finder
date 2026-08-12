/**
 * Daraz Estimate service — for every Product Hunt winner, pulls DEMAND and
 * PRICE signals from Daraz.pk public search pages:
 *
 *   estOrders     lifetime order estimate (review→order rule of thumb ×45)
 *   listingCount  how many sellers already list it (competition/whitespace)
 *   avgPrice      average visible selling price (PKR) → margin visibility
 *   demandLevel   high | medium | low | emerging | untapped
 *
 * Design rules:
 *  - Never scraped on the request path — winners' GET only READS stored
 *    estimates. Refresh happens via the throttled cron (`jobs/darazJob.js`).
 *  - Daraz failures (block, layout change) degrade to `null` — UI simply hides
 *    the block. No fake numbers, ever.
 */

import axios from 'axios';
import { connectDB } from '../lib/db.js';
import DarazEstimate from '../models/DarazEstimate.js';
import getRandomUserAgent from '../lib/fakeUserAgent.js';

const STALE_AFTER_MS = 24 * 3600 * 1000;  // re-check each product once a day
const MAX_PER_RUN    = 25;                // politeness cap per cron run
const REVIEW_TO_ORDER = 45;               // ~2.2% of buyers leave a review

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parsePrice = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'object') return parsePrice(v.value ?? v.min ?? v.price ?? 0); // A/B variants
  // "Rs. 2,998" → strip the currency word first (its dot would corrupt the number), then commas
  const str = String(v).replace(/rs\.?/gi, '').replace(/,/g, '');
  const m   = str.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

// Daraz A/B-tests its payload — one listing can carry the price in priceShow
// (string) or price (number), so try both and keep the first sane value.
const itemPrice = (it) =>
  parsePrice(it?.priceShow) || parsePrice(it?.price) ||
  parsePrice(it?.cheapest_sku?.price) || parsePrice(it?.sku?.price) || 0;

// totalResults comes as a STRING and only in some payload variants
const totalResultsOf = (json) =>
  Number(json?.mods?.mainInfo?.totalResults) ||
  Number(json?.mainInfo?.totalResults) ||
  Number(json?.mods?.filter?.totalCount) || 0;

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function classifyDemand({ totalReviews, listingCount }) {
  if (listingCount === 0) return 'untapped';   // nobody sells it yet on Daraz
  if (totalReviews === 0) return 'emerging';   // listed but no proven sales
  if (totalReviews >= 500) return 'high';
  if (totalReviews >= 50)  return 'medium';
  return 'low';
}

/** Extract the embedded g_page_config JSON from Daraz catalog SSR HTML. */
function extractCatalogJson(html) {
  const marker = 'g_page_config';
  const start  = html.indexOf(marker);
  if (start === -1) return null;
  const braceStart = html.indexOf('{', start);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(braceStart, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

/** Scrape + estimate one product name on Daraz. Returns null on any failure.
 * Uses the catalog AJAX endpoint (?ajax=true) — returns clean JSON including the
 * real totalResults count, and (unlike the SSR page) is not behind the bot wall. */
export async function estimateOnDaraz(productName) {
  const query = String(productName || '').trim();
  if (!query) return null;

  const url = `https://www.daraz.pk/catalog/?q=${encodeURIComponent(query)}&ajax=true`;
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':        getRandomUserAgent(),
        'Accept-Language':   'en-PK,en;q=0.9',
        'X-Requested-With':  'XMLHttpRequest',
        'Referer':           'https://www.daraz.pk/',
      },
      maxRedirects: 3,
      validateStatus: (s) => s === 200,
    });

    const json  = typeof res.data === 'string' ? extractCatalogJson(res.data) : res.data;
    const items = json?.mods?.listItems || json?.mods?.gridItems;
    if (!Array.isArray(items)) return null;

    // Real marketplace-wide count (e.g. 4,080) — far better than the 40-item page
    const totalListings = totalResultsOf(json) || items.length;
    const reviews = items.reduce((a, it) => a + (Number(it.review) || 0), 0);
    const prices  = items.map(itemPrice).filter((p) => p > 0);
    const ratings = items.map((it) => Number(it.ratingScore) || 0).filter((r) => r > 0);

    return {
      estOrders:    Math.round(reviews * REVIEW_TO_ORDER),
      totalReviews: reviews,
      listingCount: totalListings,
      avgPrice:     prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianPrice:  median(prices),
      topRating:    ratings.length ? Math.round((Math.max(...ratings)) * 10) / 10 : 0,
      demandLevel:  classifyDemand({ totalReviews: reviews, listingCount: totalListings }),
      query,
    };
  } catch (err) {
    console.warn(`[DarazEstimate] "${query}" scrape failed:`, err.message);
    return null;
  }
}

/**
 * Cron entry point: refresh estimates for current winners that are missing or
 * stale (> 24h). Sequential + delayed — Daraz politeness first.
 */
export async function refreshDarazEstimates() {
  const { getAdBasedWinners } = await import('./adWinningService.js');
  const winners = await getAdBasedWinners(50, null, null);
  if (!winners?.length) return { refreshed: 0, skipped: 0, failed: 0 };

  await connectDB();
  const since = new Date(Date.now() - STALE_AFTER_MS);
  const keys  = winners.map((w) => (w?.name || '').toLowerCase()).filter(Boolean);
  const fresh = await DarazEstimate
    .find({ key: { $in: keys }, checkedAt: { $gte: since } })
    .select('key category')
    .lean();
  const freshSet = new Set(fresh.map((f) => `${f.key}|${f.category}`));

  const results = { refreshed: 0, skipped: 0, failed: 0 };
  for (const w of winners) {
    if (results.refreshed + results.failed >= MAX_PER_RUN) { results.skipped++; continue; }
    const key = (w?.name || '').toLowerCase();
    if (!key) { results.skipped++; continue; }
    if (freshSet.has(`${key}|${w.category || null}`)) { results.skipped++; continue; }

    const est = await estimateOnDaraz(w.name);
    if (!est) { results.failed++; await sleep(1500 + Math.random() * 1000); continue; }

    await DarazEstimate.findOneAndUpdate(
      { key, category: w.category || null },
      { $set: { key, category: w.category || null, ...est, checkedAt: new Date() } },
      { upsert: true, new: true },
    ).catch((e) => console.warn('[DarazEstimate] save failed:', e.message));

    results.refreshed++;
    await sleep(1500 + Math.random() * 1000);
  }
  return results;
}

/** Attach stored estimates to winner objects as `daraz` (null when absent). */
export async function attachDarazEstimates(products) {
  if (!Array.isArray(products) || products.length === 0) return products;
  try {
    await connectDB();
    const keys = [...new Set(products.map((p) => (p?.name || '').toLowerCase()).filter(Boolean))];
    const rows = await DarazEstimate.find({ key: { $in: keys } }).lean();
    const map  = new Map(rows.map((r) => [`${r.key}|${r.category}`, r]));

    for (const p of products) {
      const row = map.get(`${(p?.name || '').toLowerCase()}|${p.category || null}`);
      p.daraz = row ? {
        estOrders:    row.estOrders,
        listingCount: row.listingCount,
        avgPrice:     row.avgPrice,
        topRating:    row.topRating,
        demandLevel:  row.demandLevel,
      } : null;
    }
  } catch (err) {
    console.warn('[DarazEstimate] attach failed:', err.message);
  }
  return products;
}
