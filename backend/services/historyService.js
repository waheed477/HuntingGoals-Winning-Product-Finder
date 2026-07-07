import { connectDB } from '../lib/db.js';
import ProductHistory from '../models/ProductHistory.js';

/**
 * Persist a win-score snapshot for a product.
 * Called inside updateAllWinScores after each batch write.
 */
export async function saveProductHistory(product) {
  await connectDB();
  await ProductHistory.create({
    productId:       product._id,
    productSlug:     product.slug,
    winScore:        product.winScore || 0,
    advertiserCount: product.advertiserCount || 0,
    totalAds:        product.totalAds || 0,
    maxDaysRunning:  product.maxDaysRunning || 0,
    recordedAt:      new Date(),
  });
}

/**
 * Return the win-score history for a product over the last `days` days,
 * sorted chronologically (oldest → newest).
 */
export async function getProductHistory(slug, days = 30) {
  await connectDB();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return ProductHistory.find({
    productSlug: slug,
    recordedAt:  { $gte: startDate },
  })
    .sort({ recordedAt: 1 })
    .lean();
}

/**
 * Derive a simple trend direction from the last 30 days of history.
 * Requires at least 3 data points; otherwise returns `insufficient_data`.
 */
export async function getTrendPrediction(slug) {
  const history = await getProductHistory(slug, 30);
  if (history.length < 3) return { trend: 'insufficient_data', direction: 'neutral', change: 0 };

  const first  = history[0].winScore;
  const last   = history[history.length - 1].winScore;
  const change = last - first;

  if (change > 5)  return { trend: 'rising',  direction: 'up',      change };
  if (change < -5) return { trend: 'falling', direction: 'down',    change };
  return              { trend: 'stable',  direction: 'neutral', change };
}
