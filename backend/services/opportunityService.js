/**
 * Opportunity Service
 * Calculates opportunity scores for products by comparing global demand
 * (Shopify stores + Google Shopping) with local Pakistani availability (Daraz/OLX/TikTok).
 *
 * opportunityScore = globalScore × (1 − localScore/100)
 *
 * High score = trending globally but NOT yet widely available in Pakistan
 */

import { connectDB } from '../lib/db.js';
import ShopifyProduct from '../models/ShopifyProduct.js';
import GoogleShoppingProduct from '../models/GoogleShoppingProduct.js';
import { Product } from '../models/index.js';

const USD_TO_PKR = parseFloat(process.env.USD_TO_PKR || '280');

/**
 * Get global stats for a product name (fuzzy text search across Shopify + Google Shopping).
 */
async function getGlobalStats(productName) {
  const regex = new RegExp(productName.split(' ').slice(0, 3).join('|'), 'i');

  const [shopifyDocs, googleDocs] = await Promise.all([
    ShopifyProduct.find({ productTitle: regex }).select('storeName priceUSD rating reviewCount').lean(),
    GoogleShoppingProduct.find({ productName: regex }).select('storeName priceUSD rating reviewCount').lean(),
  ]);

  const all         = [...shopifyDocs, ...googleDocs];
  const storeCount  = new Set(all.map((p) => p.storeName).filter(Boolean)).size;
  const avgRating   = all.length
    ? all.reduce((s, p) => s + (p.rating || 0), 0) / all.length
    : 0;
  const totalReviews = all.reduce((s, p) => s + (p.reviewCount || 0), 0);
  const avgPriceUSD  = all.length
    ? all.reduce((s, p) => s + (p.priceUSD || 0), 0) / all.length
    : 0;

  return { storeCount, avgRating, totalReviews, avgPriceUSD, shopifyCount: shopifyDocs.length };
}

/**
 * Get local Pakistani availability (Daraz/OLX/TikTok products count).
 */
async function getLocalAvailability(productName) {
  const regex = new RegExp(productName.split(' ').slice(0, 3).join('|'), 'i');
  const productCount = await Product.countDocuments({ name: regex });
  return { productCount };
}

/**
 * Calculate the opportunity score for a single product name.
 * @param {string} productName
 * @returns {Promise<{ score: number, gap: string, globalStores: number, avgPriceUSD: number, avgPricePKR: number }>}
 */
export async function calculateOpportunityScore(productName) {
  await connectDB();

  const [global, local] = await Promise.all([
    getGlobalStats(productName),
    getLocalAvailability(productName),
  ]);

  const globalScore = Math.min(
    100,
    global.storeCount * 2 + global.avgRating * 10 + Math.min(global.totalReviews / 100, 20)
  );
  const localScore = Math.min(100, local.productCount * 20);
  const score      = Math.round(globalScore * (1 - localScore / 100));
  const gap        = localScore < 30 ? 'HIGH' : localScore < 60 ? 'MEDIUM' : 'LOW';

  return {
    score,
    gap,
    globalStores:  global.storeCount,
    avgPriceUSD:   Math.round(global.avgPriceUSD * 100) / 100,
    avgPricePKR:   Math.round(global.avgPriceUSD * USD_TO_PKR),
    shopifyCount:  global.shopifyCount,
    localProducts: local.productCount,
  };
}

/**
 * Get top opportunities: Shopify + Google Shopping products with high opportunity scores.
 * @param {number} limit
 * @param {string|null} category
 * @returns {Promise<Array>}
 */
export async function getOpportunities(limit = 20, category = null) {
  await connectDB();

  const filter = {};
  if (category && category !== 'All') filter.category = category;

  // Aggregate: group by productTitle/productName to find unique product names
  const [shopifyProducts, googleProducts] = await Promise.all([
    ShopifyProduct.find(filter).sort({ lastSeenAt: -1 }).limit(200).lean(),
    GoogleShoppingProduct.find(filter).sort({ lastSeenAt: -1 }).limit(200).lean(),
  ]);

  // Deduplicate by a normalized product name key
  const seen   = new Set();
  const merged = [];

  for (const p of [...shopifyProducts, ...googleProducts]) {
    const nameKey = (p.productTitle || p.productName || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 40);
    if (!nameKey || seen.has(nameKey)) continue;
    seen.add(nameKey);
    merged.push({
      name:      p.productTitle || p.productName,
      priceUSD:  p.priceUSD  || 0,
      pricePKR:  p.pricePKR  || 0,
      imageUrl:  p.imageUrl  || null,
      storeName: p.storeName || null,
      storeUrl:  p.storeUrl  || null,
      category:  p.category  || 'General',
      source:    p.productId?.startsWith('shopify') ? 'shopify' : 'google',
    });
  }

  // Calculate opportunity scores in parallel (batched to avoid DB overload)
  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < Math.min(merged.length, 80); i += BATCH_SIZE) {
    const batch = merged.slice(i, i + BATCH_SIZE);
    const scores = await Promise.all(
      batch.map(async (item) => {
        const opp = await calculateOpportunityScore(item.name);
        return { ...item, ...opp };
      })
    );
    results.push(...scores);
  }

  return results
    .filter((r) => r.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default { calculateOpportunityScore, getOpportunities };
