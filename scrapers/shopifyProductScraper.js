/**
 * Shopify Product Scraper
 * Fetches products from known Shopify stores using their public /products.json API.
 * No auth required — Shopify exposes this endpoint on all stores by default.
 */

import axios from 'axios';
import ShopifyProduct from '../models/ShopifyProduct.js';
import { connectDB } from '../lib/db.js';

const USD_TO_PKR = parseFloat(process.env.USD_TO_PKR || '280');
const DELAY_MS   = 2000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Pakistani-relevant Shopify stores known to carry trending products.
 * Organized by category — add more as discovered.
 */
const SHOPIFY_STORES_BY_CATEGORY = {
  Electronics: [
    'moft.myshopify.com',
    'dji.myshopify.com',
    'anker.myshopify.com',
    'baseus.myshopify.com',
  ],
  Fashion: [
    'fashion-nova.myshopify.com',
    'gymshark.myshopify.com',
    'allbirds.myshopify.com',
    'bombas.myshopify.com',
  ],
  Beauty: [
    'theordinary.myshopify.com',
    'elfcosmetics.myshopify.com',
    'colourpopcosmetics.myshopify.com',
    'morphebrushes.myshopify.com',
  ],
  Home: [
    'ruggable.myshopify.com',
    'brooklinen.myshopify.com',
    'casper.myshopify.com',
  ],
  General: [
    'mvmtwatches.myshopify.com',
    'blendjet.myshopify.com',
    'press-london.myshopify.com',
    'ridgewallet.myshopify.com',
  ],
};

/**
 * Detect category from product title + tags.
 */
const CATEGORY_KEYWORDS = {
  Electronics: ['phone', 'laptop', 'charger', 'cable', 'wireless', 'bluetooth', 'speaker', 'earphone', 'drone'],
  Fashion:     ['shirt', 'dress', 'pants', 'jacket', 'hoodie', 'shorts', 'gym', 'leggings', 'socks'],
  Beauty:      ['serum', 'moisturizer', 'mascara', 'foundation', 'lipstick', 'skincare', 'toner', 'cleanser'],
  Home:        ['pillow', 'blanket', 'rug', 'lamp', 'storage', 'towel', 'mattress', 'sheet'],
  Toys:        ['toy', 'game', 'puzzle', 'kids', 'child', 'lego'],
  Sports:      ['yoga', 'fitness', 'running', 'bicycle', 'cricket', 'football'],
};

function inferCategory(title, tags = []) {
  const text = (title + ' ' + tags.join(' ')).toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return 'General';
}

/**
 * Fetch products from a single Shopify store.
 */
async function fetchStoreProducts(storeHandle, categoryHint, limit) {
  const url = `https://${storeHandle}/products.json?limit=${Math.min(limit, 250)}`;
  const products = [];

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendSpyBot/1.0)',
        Accept: 'application/json',
      },
      timeout: 12000,
    });

    const items = (data.products || []).slice(0, limit);

    for (const item of items) {
      const variant    = item.variants?.[0] || {};
      const priceUSD   = parseFloat(variant.price || '0');
      const imageUrl   = item.images?.[0]?.src || null;
      const tags       = typeof item.tags === 'string'
        ? item.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : (item.tags || []);

      const productId = `shopify_${storeHandle}_${item.id}`;
      const storeRoot = `https://${storeHandle}`;

      products.push({
        productId,
        storeName:    storeHandle.replace('.myshopify.com', ''),
        storeUrl:     storeRoot,
        productTitle: (item.title || 'Untitled').slice(0, 200),
        productUrl:   item.handle ? `${storeRoot}/products/${item.handle}` : storeRoot,
        priceUSD,
        pricePKR:    Math.round(priceUSD * USD_TO_PKR),
        imageUrl,
        vendor:      item.vendor || null,
        tags,
        reviewCount: 0,
        rating:      0,
        category:    inferCategory(item.title, tags) || categoryHint,
        lastSeenAt:  new Date(),
      });
    }
  } catch (err) {
    console.warn(`[ShopifyScraper] ${storeHandle} failed: ${err.message}`);
  }

  return products;
}

/**
 * Scrape Shopify products for a category.
 * @param {string} category
 * @param {number} limit  Per-store limit
 * @returns {Promise<{ products: Array, saved: number, skipped: number }>}
 */
export async function scrapeShopifyProducts(category = 'General', limit = 30) {
  await connectDB();

  const stores = SHOPIFY_STORES_BY_CATEGORY[category] || SHOPIFY_STORES_BY_CATEGORY.General;
  const allProducts = [];

  for (const store of stores) {
    const items = await fetchStoreProducts(store, category, limit);
    allProducts.push(...items);
    await sleep(DELAY_MS);
  }

  let saved   = 0;
  let skipped = 0;

  for (const p of allProducts) {
    try {
      await ShopifyProduct.findOneAndUpdate(
        { productId: p.productId },
        { $set: { ...p, lastSeenAt: new Date() } },
        { upsert: true, new: true }
      );
      saved++;
    } catch {
      skipped++;
    }
  }

  console.log(`[ShopifyScraper] ${category}: saved=${saved} skipped=${skipped} total=${allProducts.length}`);
  return { products: allProducts, saved, skipped };
}

export default scrapeShopifyProducts;
