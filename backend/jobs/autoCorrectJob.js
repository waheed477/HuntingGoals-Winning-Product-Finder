/**
 * Auto-Correct Job
 * Runs every 12 hours to detect and fix data quality issues:
 *   1. Image mismatches (image URL doesn't match product type)
 *   2. Seasonal score inconsistencies (off-season product with high win score)
 *   3. Stale competitor counts
 *   4. Confidence score refresh
 */

import cron from 'node-cron';
import { connectDB } from '../lib/db.js';
import { Product } from '../models/index.js';
import { validateImageMatch, getFallbackImage } from '../utils/productImageValidator.js';
import { getSeasonalScore } from '../services/seasonalFilterService.js';
import { calculateConfidenceScore, confidenceLabel } from '../services/productVerificationService.js';
import { updateCompetitorCounts } from './competitorJob.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fix image mismatches, seasonal penalties, and confidence scores for all products.
 */
export async function autoCorrectProducts() {
  await connectDB();

  if (process.env.AUTO_CORRECT_ENABLED !== 'true') {
    console.log('[AutoCorrect] Skipped — AUTO_CORRECT_ENABLED is not true');
    return { fixed: 0, skipped: 0 };
  }

  const products = await Product.find({}).lean();
  console.log(`[AutoCorrect] Checking ${products.length} products…`);

  let fixed   = 0;
  let skipped = 0;
  const bulkOps = [];

  for (const product of products) {
    const updates = {};
    let needsUpdate = false;

    // ── Fix 1: Image mismatch detection ─────────────────────────────────────
    if (product.imageUrl) {
      const { valid, confidence } = validateImageMatch(
        product.name,
        '',
        product.imageUrl
      );

      if (!valid && confidence < 0.3) {
        updates.imageMismatchFlag = true;
        needsUpdate = true;
        console.log(`[AutoCorrect] Image mismatch detected: "${product.name}"`);
      } else if (product.imageMismatchFlag && (valid || confidence >= 0.35)) {
        updates.imageMismatchFlag = false;
        needsUpdate = true;
      }
    }

    // ── Fix 2: Seasonal score adjustment ────────────────────────────────────
    if (process.env.SEASONAL_FILTERING === 'true') {
      const { score: seasonalScore, warning } = getSeasonalScore(
        product.category,
        product.name
      );

      // Only adjust if the seasonal penalty is large AND score hasn't been manually set
      if (warning && product.winScore > 50 && seasonalScore < 15) {
        updates.seasonalWarning = warning;
        needsUpdate = true;
        console.log(`[AutoCorrect] Seasonal warning set for "${product.name}": ${warning}`);
      } else if (!warning && product.seasonalWarning) {
        updates.seasonalWarning = null;
        needsUpdate = true;
      }
    }

    // ── Fix 3: Confidence score refresh ─────────────────────────────────────
    const newConfidenceScore = calculateConfidenceScore(product);
    const threshold = parseInt(process.env.CONFIDENCE_THRESHOLD, 10) || 60;
    const newIsVerified = newConfidenceScore >= threshold;

    if (newIsVerified !== product.isVerified) {
      updates.isVerified = newIsVerified;
      needsUpdate = true;
    }

    if (needsUpdate) {
      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: updates },
        },
      });
      fixed++;
    } else {
      skipped++;
    }
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  console.log(`[AutoCorrect] Done. Fixed: ${fixed}, Skipped: ${skipped}`);
  return { fixed, skipped };
}

/**
 * Start the auto-correct cron job (every 12 hours).
 */
export function startAutoCorrectJob() {
  if (process.env.CRON_ENABLED !== 'true') {
    console.log('[AutoCorrectJob] Skipped — CRON_ENABLED is not true');
    return;
  }

  cron.schedule('0 */12 * * *', async () => {
    console.log(`[${new Date().toISOString()}] [AutoCorrectJob] Running…`);
    try {
      await autoCorrectProducts();
    } catch (err) {
      console.error('[AutoCorrectJob] Error:', err.message);
    }
  });

  console.log('[AutoCorrectJob] Scheduled — every 12 hours');
}

export default { startAutoCorrectJob, autoCorrectProducts };
