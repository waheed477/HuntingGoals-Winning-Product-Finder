/**
 * TikTok Scraper — TikTok Official API
 * Replaced fits-api with the Official API via tiktokOfficialService.
 * Fetches trending videos in Pakistan, extracts product signals,
 * and updates Product documents in MongoDB.
 */

import { connectDB }                    from '../lib/db.js';
import { Product }                       from '../models/index.js';
import {
  fetchPakistanTrendingSignals,
  searchVideos,
  getHashtagStats,
}                                        from '../services/tiktokOfficialService.js';

// Keywords in captions that signal a product mention
const PRODUCT_KEYWORDS = [
  'buy', 'order', 'price', 'sale', 'discount', 'deal', 'shop', 'available',
  'pkr', 'rs.', 'rupees', 'daraz', 'olx', 'delivery', 'cod', 'cash on delivery',
];

// Pakistani e-commerce hashtags to scan when no specific account is targeted
const PK_SHOPPING_HASHTAGS = [
  'pakistanshopping',
  'darazpakistan',
  'trendingproducts',
  'olxpakistan',
  'onlineshopping',
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Signal Extraction ────────────────────────────────────────────────────────

function extractProductMentions(description) {
  if (!description) return [];
  const lower = description.toLowerCase();
  const hasMention = PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasMention) return [];

  const hashtagMatches = description.match(/#([a-zA-Z][a-zA-Z0-9_]{2,})/g) || [];
  const ignore = new Set([
    'darazpakistan', 'olxpakistan', 'pakistanshopping', 'pakistan',
    'viral', 'fyp', 'foryou', 'trending', 'tiktok', 'shop',
  ]);

  return hashtagMatches
    .map((h) =>
      h.slice(1)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .toLowerCase()
        .trim()
    )
    .filter((name) => name.length > 3 && !ignore.has(name.replace(/\s/g, '')));
}

function aggregateStats(videos) {
  let totalViews = 0;
  let totalLikes = 0;
  const productMentions = [];

  for (const v of videos) {
    totalViews += v.viewCount  || 0;
    totalLikes += v.likeCount  || 0;
    productMentions.push(...extractProductMentions(v.description || ''));
  }

  return { totalViews, totalLikes, videoCount: videos.length, productMentions };
}

// ─── DB Update ────────────────────────────────────────────────────────────────

async function updateProductSignals(productMentions, viewsToAdd, hashtagVolume) {
  let updated = 0;
  for (const mention of [...new Set(productMentions)]) {
    try {
      const result = await Product.findOneAndUpdate(
        { name: { $regex: mention, $options: 'i' } },
        {
          $inc: { tiktokViews: viewsToAdd, tiktokHashtagVolume: hashtagVolume },
          $set: { lastScrapedAt: new Date() },
          $addToSet: { platforms: 'tiktok' },
        },
        { new: true }
      );
      if (result) {
        if (typeof result.updateWinScore === 'function') result.updateWinScore();
        await result.save();
        updated++;
      }
    } catch (err) {
      console.warn(`[TikTok] Failed to update product "${mention}":`, err.message);
    }
  }
  return updated;
}

// ─── Main Scraper ─────────────────────────────────────────────────────────────

/**
 * Main TikTok scraper — uses TikTok Official API.
 * @param {Object} opts
 * @param {string[]} [opts.hashtags]    — override default PK hashtags
 * @param {number}  [opts.maxVideos]   — videos per hashtag (default 30)
 */
async function tiktokScraper({ hashtags, maxVideos = 30 } = {}) {
  await connectDB();

  const targets = hashtags || PK_SHOPPING_HASHTAGS;
  const signals = [];
  let totalProductsUpdated = 0;

  console.log(`[TikTok] Starting official API scrape for ${targets.length} hashtags…`);

  for (const tag of targets) {
    console.log(`[TikTok] Fetching videos for #${tag}`);

    try {
      const [videos, hashtagStats] = await Promise.all([
        searchVideos({ hashtag: tag, limit: maxVideos }),
        getHashtagStats(tag),
      ]);

      if (!videos.length) {
        console.log(`[TikTok] #${tag}: no videos returned`);
        continue;
      }

      const stats = aggregateStats(videos);

      console.log(
        `[TikTok] #${tag}: ${stats.videoCount} videos, ` +
        `${stats.totalViews.toLocaleString()} views, ` +
        `${stats.productMentions.length} product mentions, ` +
        `hashtagVolume=${hashtagStats.viewCount.toLocaleString()}`
      );

      signals.push({
        hashtag:   tag,
        hashtagViewCount: hashtagStats.viewCount,
        ...stats,
        scrapedAt: new Date(),
      });

      const updated = await updateProductSignals(
        stats.productMentions,
        stats.totalViews,
        hashtagStats.viewCount || stats.videoCount * 500
      );
      totalProductsUpdated += updated;

    } catch (err) {
      console.error(`[TikTok] Error for #${tag}:`, err.message);
    }

    // Polite delay — stay within sandbox rate limit (30 req/min)
    await delay(2000 + Math.random() * 1000);
  }

  console.log(`[TikTok] Done. Hashtags scraped: ${signals.length}, Products updated: ${totalProductsUpdated}`);
  return { signals, productsUpdated: totalProductsUpdated };
}

export default tiktokScraper;
