/**
 * Google Shopping Scraper
 * Scrapes Google Shopping for products that ship to Pakistan.
 * Uses axios + cheerio (lightweight, no headless browser required).
 * Respects rate limits with random delays between requests.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import GoogleShoppingProduct from '../models/GoogleShoppingProduct.js';
import { connectDB } from '../lib/db.js';

const USD_TO_PKR = parseFloat(process.env.USD_TO_PKR || '280');
const DELAY_MS   = 2500;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Parse a USD price string like "$18.99" or "US $12.50" into a number.
 */
function parseUSD(str) {
  if (!str) return 0;
  const match = str.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Parse a rating string like "4.5 out of 5" or "4.5" into a number.
 */
function parseRating(str) {
  if (!str) return 0;
  const match = str.match(/[\d.]+/);
  return match ? Math.min(parseFloat(match[0]), 5) : 0;
}

/**
 * Parse review count like "(1,234)" or "1234 reviews".
 */
function parseReviewCount(str) {
  if (!str) return 0;
  const match = str.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Map a search term to a category label.
 */
const TERM_TO_CATEGORY = {
  electronics:  'Electronics',
  mobile:       'Electronics',
  fashion:      'Fashion',
  clothing:     'Fashion',
  beauty:       'Beauty',
  skincare:     'Beauty',
  home:         'Home',
  kitchen:      'Home',
  grocery:      'Grocery',
  toys:         'Toys',
  sports:       'Sports',
};

function inferCategory(term) {
  const lower = (term || '').toLowerCase();
  for (const [key, cat] of Object.entries(TERM_TO_CATEGORY)) {
    if (lower.includes(key)) return cat;
  }
  return 'General';
}

/**
 * Scrape Google Shopping for a search term.
 * @param {string} searchTerm
 * @param {number} limit
 * @returns {Promise<{ products: Array, saved: number, skipped: number }>}
 */
export async function scrapeGoogleShopping(searchTerm, limit = 20) {
  await connectDB();

  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm + ' pakistan')}&tbs=ship:pk&hl=en&gl=pk`;
  const category = inferCategory(searchTerm);
  const products = [];

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': randomAgent(),
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: 'https://www.google.com/',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);

    // Google Shopping result selectors (multiple fallbacks)
    const items = $('div.sh-dgr__grid-result, div[data-docid], .sh-pr__product-result').toArray();

    for (const el of items.slice(0, limit)) {
      const $el = $(el);
      const name     = $el.find('h3, .Xjkr3b, .tAxDx, [class*="title"]').first().text().trim();
      const priceRaw = $el.find('.a8Pemb, .OFFNJ, [class*="price"]').first().text().trim();
      const store    = $el.find('.aULzUe, .E5ocAb, [class*="merchant"]').first().text().trim();
      const ratingRaw   = $el.find('.Rsc7Yb, [class*="rating"]').first().attr('aria-label') || $el.find('[class*="star"]').first().text().trim();
      const reviewRaw   = $el.find('.NzUzee, [class*="review"]').first().text().trim();
      const imgSrc      = $el.find('img').first().attr('src') || null;
      const href        = $el.find('a').first().attr('href') || null;

      if (!name || name.length < 3) continue;

      const priceUSD    = parseUSD(priceRaw);
      const productId   = `gs_${Buffer.from(name + store).toString('base64').slice(0, 24)}`;

      products.push({
        productId,
        productName: name.slice(0, 200),
        priceUSD,
        pricePKR:        Math.round(priceUSD * USD_TO_PKR),
        storeName:       store || null,
        storeUrl:        href  ? `https://www.google.com${href}` : null,
        rating:          parseRating(ratingRaw),
        reviewCount:     parseReviewCount(reviewRaw),
        shipsToPakistan: true,
        imageUrl:        imgSrc || null,
        productUrl:      href ? `https://www.google.com${href}` : null,
        category,
        searchTerm,
        lastSeenAt:      new Date(),
      });
    }

    // If Google blocked us / returned zero structured results, log and continue
    if (products.length === 0) {
      console.warn(`[GoogleShoppingScraper] No structured results for "${searchTerm}" — Google may be blocking. Consider adding a delay.`);
    }
  } catch (err) {
    console.warn(`[GoogleShoppingScraper] Fetch failed for "${searchTerm}": ${err.message}`);
    return { products: [], saved: 0, skipped: 0 };
  }

  let saved = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      await GoogleShoppingProduct.findOneAndUpdate(
        { productId: p.productId },
        { $set: { ...p, lastSeenAt: new Date() } },
        { upsert: true, new: true }
      );
      saved++;
    } catch {
      skipped++;
    }
    await sleep(100);
  }

  await sleep(DELAY_MS);
  console.log(`[GoogleShoppingScraper] "${searchTerm}": saved=${saved} skipped=${skipped}`);
  return { products, saved, skipped };
}

export default scrapeGoogleShopping;
