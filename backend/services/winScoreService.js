/**
 * Win Score Calculation Engine
 * Computes a 0-100 Win Score for each product based on weighted market signals.
 *
 * | Signal               | Weight | Source field              |
 * |----------------------|--------|---------------------------|
 * | Daraz sales velocity | 20     | darazOrders               |
 * | Google Trends spike  | 15     | googleTrendSpike (%)       |
 * | Facebook active ads  | 20     | activeAds                 |
 * | Social engagement    | 15     | tiktokViews               |
 * | OLX marketplace      | 10     | olxViews + olxListings    |
 * | Alibaba order surge  | 10     | alibabaOrderSurge (%)     |
 * | Seasonal relevance   | 10     | seasonalRelevance (0-100) |
 */

import { connectDB } from '../lib/db.js';
import { Product } from '../models/index.js';
import { getSeasonalRelevance } from './seasonalService.js';
import { emitNewWinningProduct, emitScoreUpdate } from '../lib/socketEmitter.js';
import { saveProductHistory } from './historyService.js';

// Score weight table (must sum to 100)
const WEIGHTS = {
  darazSalesVelocity: 20,
  googleTrendsSpike:  15,
  facebookActiveAds:  20,
  socialEngagement:   15,
  olxMarketplace:     10,
  alibabaOrderSurge:  10,
  seasonalRelevance:  10,
};

// Normalization caps — values above these are treated as 100
const CAPS = {
  darazOrders:       5000,
  googleTrendSpike:  150,
  activeAds:         50,
  tiktokViews:       5000000,
  olxViews:          100000,
  olxListings:       500,
  alibabaOrderSurge: 100,
};

/**
 * Normalize a raw value to a 0–100 scale, capped at `cap`.
 */
function normalize(value, cap) {
  if (!value || value <= 0) return 0;
  return Math.min((value / cap) * 100, 100);
}

/**
 * Calculate the Win Score for a single product object.
 * Does NOT persist — caller is responsible for saving.
 */
export function calculateWinScore(product) {
  const hasData =
    product.darazOrders > 0 ||
    product.googleTrendSpike > 0 ||
    product.activeAds > 0 ||
    product.tiktokViews > 0 ||
    product.olxViews > 0 ||
    product.alibabaOrderSurge > 0;

  if (!hasData) return 30;

  const seasonal =
    product.seasonalRelevance > 0
      ? product.seasonalRelevance
      : getSeasonalRelevance(product.category);

  const darazScore   = normalize(product.darazOrders, CAPS.darazOrders);
  const trendsScore  = normalize(product.googleTrendSpike, CAPS.googleTrendSpike);
  const adsScore     = normalize(product.activeAds, CAPS.activeAds);
  const tiktokScore  = normalize(product.tiktokViews, CAPS.tiktokViews);
  const olxScore     = normalize(
    (product.olxViews || 0) + (product.olxListings || 0) * 100,
    CAPS.olxViews
  );
  const alibabaScore = normalize(product.alibabaOrderSurge, CAPS.alibabaOrderSurge);
  const seasonScore  = Math.min(seasonal, 100);

  const raw =
    darazScore   * (WEIGHTS.darazSalesVelocity / 100) +
    trendsScore  * (WEIGHTS.googleTrendsSpike  / 100) +
    adsScore     * (WEIGHTS.facebookActiveAds  / 100) +
    tiktokScore  * (WEIGHTS.socialEngagement   / 100) +
    olxScore     * (WEIGHTS.olxMarketplace     / 100) +
    alibabaScore * (WEIGHTS.alibabaOrderSurge  / 100) +
    seasonScore  * (WEIGHTS.seasonalRelevance  / 100);

  return Math.min(Math.round(raw), 100);
}

/**
 * Recalculate and persist Win Scores for all products.
 * Emits socket events for new winners and significant score changes.
 */
export async function updateAllWinScores({ batchSize = 100 } = {}) {
  await connectDB();

  let processed = 0;
  let updated   = 0;
  let winners   = 0;
  let skip      = 0;
  const newWinners = [];

  console.log(`[${new Date().toISOString()}] [WinScore] Starting full score update…`);

  while (true) {
    const batch = await Product.find({})
      .select('name slug category darazOrders googleTrendSpike activeAds tiktokViews olxViews olxListings alibabaOrderSurge seasonalRelevance winScore isWinning cities priceMin priceMax imageUrl trend')
      .skip(skip)
      .limit(batchSize)
      .lean();

    if (batch.length === 0) break;

    const bulkOps = [];

    for (const product of batch) {
      const oldScore   = product.winScore || 0;
      const newScore   = calculateWinScore(product);
      const wasWinning = product.isWinning || false;
      const isWinning  = newScore >= 75;

      if (isWinning) winners++;

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { winScore: newScore, isWinning } },
        },
      });

      // Persist history snapshot (fire-and-forget per product)
      saveProductHistory({ ...product, winScore: newScore }).catch(() => {});

      // Emit: newly crossed the winning threshold
      if (isWinning && !wasWinning) {
        const enriched = { ...product, winScore: newScore, isWinning };
        newWinners.push(enriched);
        emitNewWinningProduct(enriched).catch(() => {});
      }

      // Emit: score changed significantly (>= 10 points)
      if (Math.abs(newScore - oldScore) >= 10) {
        emitScoreUpdate({ ...product, winScore: newScore }, oldScore).catch(() => {});
      }
    }

    await Product.bulkWrite(bulkOps);

    processed += batch.length;
    updated   += bulkOps.length;
    skip      += batchSize;

    console.log(`[WinScore] Processed ${processed} products so far…`);
  }

  console.log(
    `[${new Date().toISOString()}] [WinScore] Done. Processed: ${processed}, Updated: ${updated}, Winners (≥75): ${winners}`
  );

  return { processed, updated, winners, newWinners };
}

/**
 * Fetch winning products filtered by optional city, category, and minimum score.
 */
export async function getWinningProducts({ city, category, minScore = 75 } = {}) {
  await connectDB();

  const query = { winScore: { $gte: minScore } };
  if (city) query.cities = city;
  if (category) query.category = category;

  return Product.find(query)
    .sort({ winScore: -1 })
    .select('name slug category winScore cities platforms priceMin priceMax trend imageUrl')
    .lean();
}

export default { calculateWinScore, updateAllWinScores, getWinningProducts };
