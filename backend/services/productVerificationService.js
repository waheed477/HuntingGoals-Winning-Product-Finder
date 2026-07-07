/**
 * Product Verification Service
 * Cross-platform confidence scoring for products.
 * Grades each product as high/medium/low confidence based on
 * how many platforms confirm its existence and data.
 */

import axios from 'axios';
import { connectDB } from '../lib/db.js';
import { Product } from '../models/index.js';

const REQUEST_TIMEOUT = 8000;

/**
 * Quick HTTP check — does the image URL return a 2xx response?
 */
async function checkImageUrl(url) {
  if (!url) return false;
  try {
    const res = await axios.head(url, { timeout: REQUEST_TIMEOUT, validateStatus: () => true });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

/**
 * Calculate a confidence score (0-100) from a product's stored signals.
 * This is a fast, in-process calculation — no external HTTP calls.
 *
 * Signal contributions:
 *   Daraz orders/rating  → up to 40 pts
 *   OLX listings/views   → up to 20 pts
 *   TikTok engagement    → up to 20 pts
 *   Facebook ads running → up to 10 pts
 *   Google Trends spike  → up to 10 pts
 */
export function calculateConfidenceScore(product) {
  let score = 0;

  // Daraz (primary e-commerce)
  if (product.darazOrders > 0) score += 25;
  if (product.darazOrders > 500) score += 10;
  if (product.darazRating >= 4) score += 5;

  // OLX (local marketplace)
  if (product.olxListings > 0) score += 10;
  if (product.olxViews > 1000) score += 10;

  // TikTok engagement
  if (product.tiktokViews > 10000) score += 10;
  if (product.tiktokViews > 500000) score += 10;

  // Facebook ads (someone is spending money = demand signal)
  if (product.activeAds > 0) score += 5;
  if (product.activeAds > 5) score += 5;

  // Google Trends
  if (product.googleTrendSpike > 20) score += 5;
  if (product.googleTrendSpike > 50) score += 5;

  return Math.min(score, 100);
}

/**
 * Convert a numeric confidence score to a label.
 */
export function confidenceLabel(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * Verify a single product object (in-memory — no DB write).
 * Returns enriched product with confidence fields.
 */
export function verifyProduct(product) {
  const score = calculateConfidenceScore(product);
  const label = confidenceLabel(score);
  const isVerified = score >= (parseInt(process.env.CONFIDENCE_THRESHOLD, 10) || 60);

  return {
    ...product,
    confidenceScore: score,
    confidence: label,
    isVerified,
    verificationNote: product.imageMismatchFlag
      ? 'Image may not match product — verify before sourcing'
      : null,
  };
}

/**
 * Batch verify products and persist isVerified flag to DB.
 * @param {{ minScore?: number, limit?: number }} opts
 */
export async function verifyAndPersist({ minScore = 0, limit = 500 } = {}) {
  await connectDB();

  const products = await Product.find({ winScore: { $gte: minScore } })
    .limit(limit)
    .lean();

  let updated = 0;
  const bulkOps = [];

  for (const p of products) {
    const score = calculateConfidenceScore(p);
    const isVerified = score >= (parseInt(process.env.CONFIDENCE_THRESHOLD, 10) || 60);

    bulkOps.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { isVerified, confidenceScore: score } },
      },
    });
    updated++;
  }

  if (bulkOps.length > 0) {
    await Product.bulkWrite(bulkOps);
  }

  console.log(`[ProductVerification] Updated ${updated} products`);
  return { updated };
}

export default { verifyProduct, verifyAndPersist, calculateConfidenceScore, confidenceLabel };
