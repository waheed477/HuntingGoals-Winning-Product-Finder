/**
 * Competitor Count Job
 * Runs every 6 hours to update competitor counts for high-scoring products.
 * Uses FB Ads scraper data already in the database to count unique advertisers
 * per product category — avoids live scraping for this background job.
 */

import cron from 'node-cron';
import { connectDB } from '../lib/db.js';
import { Product, ScrapedAd } from '../models/index.js';

/**
 * Count unique competitors (advertisers) for a product by matching
 * category and partial name against stored ScrapedAd documents.
 */
async function countCompetitorsFromDB(productName, category) {
  const words = productName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);

  if (words.length === 0) return { count: 0, advertisers: [] };

  // Build a regex that matches any of the key product words
  const pattern = new RegExp(words.join('|'), 'i');

  const ads = await ScrapedAd.find({
    category,
    $or: [
      { headline: { $regex: pattern } },
      { description: { $regex: pattern } },
    ],
  })
    .select('advertiserName')
    .lean();

  const unique = [...new Set(ads.map((a) => a.advertiserName).filter(Boolean))];

  return {
    count:       unique.length,
    advertisers: unique.slice(0, 10),
  };
}

/**
 * Update competitor counts for all products with winScore >= 60.
 */
export async function updateCompetitorCounts() {
  await connectDB();

  const products = await Product.find({ winScore: { $gte: 60 } })
    .select('_id name category competitorCount lastCompetitorCheck')
    .lean();

  console.log(`[CompetitorJob] Updating ${products.length} products…`);
  let updated = 0;

  for (const product of products) {
    try {
      const { count, advertisers } = await countCompetitorsFromDB(product.name, product.category);

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            competitorCount:       count,
            topCompetitors:        advertisers,
            lastCompetitorCheck:   new Date(),
          },
        }
      );
      updated++;
    } catch (err) {
      console.warn(`[CompetitorJob] Failed for "${product.name}": ${err.message}`);
    }
  }

  console.log(`[CompetitorJob] Done. Updated ${updated}/${products.length} products`);
  return { updated, total: products.length };
}

/**
 * Start the scheduled competitor-count job (every 6 hours).
 */
export function startCompetitorJob() {
  if (process.env.CRON_ENABLED !== 'true') {
    console.log('[CompetitorJob] Skipped — CRON_ENABLED is not true');
    return;
  }

  cron.schedule('0 */6 * * *', async () => {
    console.log(`[${new Date().toISOString()}] [CompetitorJob] Running…`);
    try {
      await updateCompetitorCounts();
    } catch (err) {
      console.error('[CompetitorJob] Error:', err.message);
    }
  });

  console.log('[CompetitorJob] Scheduled — every 6 hours');
}

export default { startCompetitorJob, updateCompetitorCounts };
