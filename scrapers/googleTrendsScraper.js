/**
 * Google Trends Scraper
 * Fetches search interest data for product keywords using the google-trends-api package.
 * Updates TrendScore collection with daily search volume and updates Product.googleTrendSpike.
 */

import googleTrends from 'google-trends-api';
import { connectDB } from '../lib/db.js';
import { Product, TrendScore } from '../models/index.js';

// Google Trends uses DMA region codes — Pakistan geo code
const GEO_PAKISTAN = 'PK';

// Google Trends city geo codes for Pakistan
const CITY_GEO = {
  Lahore:     'PK-PB',  // Punjab province (includes Lahore)
  Karachi:    'PK-SD',  // Sindh province (includes Karachi)
  Islamabad:  'PK-IS',  // Islamabad Capital Territory
  Faisalabad: 'PK-PB',
  Rawalpindi: 'PK-PB',
  Multan:     'PK-PB',
  Peshawar:   'PK-KP',  // Khyber Pakhtunkhwa
  Quetta:     'PK-BA',  // Balochistan
  Sialkot:    'PK-PB',
  Gujranwala: 'PK-PB',
};

const REQUEST_DELAY_MS = 3000; // Google Trends rate-limits aggressively
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch interest over time for a keyword in Pakistan.
 * Returns normalized scores (0-100) per day.
 * @param {string} keyword
 * @param {number} days
 * @param {string} geo
 * @returns {Promise<Array<{ date: Date, value: number }>>}
 */
async function fetchInterestOverTime(keyword, days = 30, geo = GEO_PAKISTAN) {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);

  try {
    const raw = await googleTrends.interestOverTime({
      keyword,
      startTime,
      endTime,
      geo,
    });

    const parsed = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData || [];

    return timeline.map((point) => ({
      date: new Date(point.time * 1000),
      value: point.value[0] || 0,
    }));
  } catch (err) {
    console.warn(`[GTrends] Failed to fetch data for "${keyword}":`, err.message);
    return [];
  }
}

/**
 * Fetch related queries (rising) for a keyword to identify breakout search terms.
 * @param {string} keyword
 * @param {string} geo
 * @returns {Promise<Array<{ query: string, value: string }>>}
 */
async function fetchRisingQueries(keyword, geo = GEO_PAKISTAN) {
  try {
    const raw = await googleTrends.relatedQueries({ keyword, geo });
    const parsed = JSON.parse(raw);
    const rising = parsed?.default?.rankedList?.[1]?.rankedKeyword || [];
    return rising.map((q) => ({ query: q.query, value: q.value }));
  } catch {
    return [];
  }
}

/**
 * Calculate googleTrendSpike: percentage change from first half to second half of the period.
 * @param {Array<{ value: number }>} timeline
 * @returns {number} Percentage spike (0 if flat)
 */
function calculateSpike(timeline) {
  if (timeline.length < 4) return 0;
  const mid = Math.floor(timeline.length / 2);
  const firstHalfAvg = timeline.slice(0, mid).reduce((s, t) => s + t.value, 0) / mid || 1;
  const secondHalfAvg = timeline.slice(mid).reduce((s, t) => s + t.value, 0) / (timeline.length - mid) || 0;
  return Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
}

/**
 * Upsert TrendScore documents for a product's daily timeline.
 * Uses the unique compound index (productId + date + city) for safe upserts.
 */
async function saveTrendScores(product, timeline, prevTimeline, city = null) {
  const saves = timeline.map(async ({ date, value }) => {
    // Find matching data point from previous period for week-over-week comparison
    const dayOfWeek = date.getDay();
    const prevPoint = prevTimeline.find(
      (p) => p.date.getDay() === dayOfWeek
    );
    const weekOverWeekChange = prevPoint?.value
      ? Math.round(((value - prevPoint.value) / (prevPoint.value || 1)) * 100)
      : 0;

    return TrendScore.findOneAndUpdate(
      { productId: product._id, date: { $gte: new Date(date.setHours(0,0,0,0)), $lt: new Date(date.setHours(23,59,59,999)) }, city },
      {
        $set: {
          productSlug: product.slug,
          category: product.category,
          searchVolume: value,
          dailyScore: value,
          weekOverWeekChange,
          city,
        },
      },
      { upsert: true, new: true }
    ).catch((err) => {
      console.warn(`[GTrends] TrendScore upsert error:`, err.message);
    });
  });

  await Promise.allSettled(saves);
}

/**
 * Main scraper function.
 * @param {{ productIds?: string[], days?: number }} options
 */
async function googleTrendsScraper({ productIds, days = 30 } = {}) {
  await connectDB();

  // Fetch products to process (limited to 10 per run to avoid rate limits)
  const query = productIds ? { _id: { $in: productIds } } : {};
  const products = await Product.find(query).select('name slug category googleTrendSpike').limit(10).lean();

  if (products.length === 0) {
    console.log('[GTrends] No products to process.');
    return { processed: 0, updated: 0 };
  }

  let processed = 0;
  let updated = 0;

  for (const product of products) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [GTrends] Processing: "${product.name}"`);

    try {
      // Fetch current period and previous period (for WoW change)
      const [current, previous] = await Promise.all([
        fetchInterestOverTime(product.name, days, GEO_PAKISTAN),
        fetchInterestOverTime(product.name, days * 2, GEO_PAKISTAN),
      ]);

      if (current.length === 0) {
        console.warn(`[GTrends] No data returned for "${product.name}"`);
        processed++;
        await delay(REQUEST_DELAY_MS);
        continue;
      }

      const spike = calculateSpike(current);
      const prevTimeline = previous.slice(0, Math.floor(previous.length / 2));

      // Save national (no city filter) trend scores
      await saveTrendScores({ _id: product._id, slug: product.slug, category: product.category }, current, prevTimeline, null);

      // Update Product.googleTrendSpike
      await Product.findByIdAndUpdate(product._id, {
        googleTrendSpike: Math.max(0, spike),
        ...(spike > 30 ? { trend: 'rising' } : {}),
      });

      updated++;
      processed++;

      console.log(`[GTrends] "${product.name}" — spike: ${spike}%, data points: ${current.length}`);

      // Respectful delay between API calls
      await delay(REQUEST_DELAY_MS + Math.random() * 1000);
    } catch (err) {
      console.error(`[GTrends] Error processing "${product.name}":`, err.message);
      processed++;
      await delay(REQUEST_DELAY_MS);
    }
  }

  console.log(`[GTrends] Done. Processed: ${processed}, Updated: ${updated}`);
  return { processed, updated };
}

export default googleTrendsScraper;
