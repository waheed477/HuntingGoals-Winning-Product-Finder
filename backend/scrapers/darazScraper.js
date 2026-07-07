/**
 * Daraz.pk Scraper
 * Targets best-sellers and category search results on Daraz Pakistan.
 *
 * Extraction strategy (in priority order):
 *   1. __NEXT_DATA__ / window.__INITIAL_DATA__ JSON embedded in page
 *   2. <script type="application/ld+json"> Product entries
 *   3. Rendered HTML card selectors (cheerio)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { connectDB } from '../lib/db.js';
import { Product } from '../models/index.js';
import { getRandomUserAgent } from '../lib/fakeUserAgent.js';

const BASE_URL = 'https://www.daraz.pk';
const REQUEST_DELAY_MS = 2000;

const CATEGORY_URLS = [
  { category: 'Electronics', path: '/consumer-electronics/?sort=popularity' },
  { category: 'Fashion',     path: '/womens-western-wear/?sort=popularity'  },
  { category: 'Beauty',      path: '/beauty-health/?sort=popularity'        },
  { category: 'Home',        path: '/home-appliances/?sort=popularity'      },
  { category: 'Sports',      path: '/sports/?sort=popularity'               },
  { category: 'Toys',        path: '/toys-games/?sort=popularity'           },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function buildHeaders() {
  return {
    'User-Agent':                getRandomUserAgent(),
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language':           'en-US,en;q=0.5',
    'Accept-Encoding':           'gzip, deflate, br',
    'Connection':                'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control':             'no-cache',
    'Pragma':                    'no-cache',
  };
}

// ─── Strategy 1: __NEXT_DATA__ JSON ──────────────────────────────────────────

function extractFromNextData(html, category) {
  const products = [];
  try {
    const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return products;

    const json = JSON.parse(match[1]);

    // Daraz embeds product list in several possible paths
    const candidates = [
      json?.props?.pageProps?.initialData?.data?.products,
      json?.props?.pageProps?.listingData?.modules,
      json?.props?.pageProps?.data?.products,
    ].filter(Array.isArray);

    for (const list of candidates) {
      for (const item of list) {
        const p = item?.item || item;
        const name = (p?.name || p?.title || '').trim();
        const price = parseFloat(
          (p?.price || p?.promotionPrice || p?.originalPrice || '0')
            .toString()
            .replace(/[^0-9.]/g, '')
        );
        // Image: try multiple fields
        const imageUrl =
          p?.image || p?.imageUrl || p?.mainImage ||
          p?.images?.[0] || null;

        if (name && name.length > 3) {
          products.push({
            name,
            priceMin: price || 0,
            priceMax: price || 0,
            imageUrl,
            darazRating: parseFloat(p?.ratingScore || p?.rating || 0),
            darazOrders: parseInt(p?.review || p?.orders || 0, 10),
            category,
            platforms: ['daraz'],
          });
        }
      }
      if (products.length > 0) break;
    }
  } catch (err) {
    // __NEXT_DATA__ not present or malformed — not a fatal error
  }
  return products;
}

// ─── Strategy 2: window.__INITIAL_DATA__ ─────────────────────────────────────

function extractFromWindowData(html, category) {
  const products = [];
  try {
    const match = html.match(/window\.__INITIAL_DATA__\s*=\s*({[\s\S]*?});\s*(?:window|<\/script>)/);
    if (!match) return products;

    const json = JSON.parse(match[1]);
    const items =
      json?.mods?.listItems ||
      json?.data?.listItems ||
      json?.listItems || [];

    for (const item of items) {
      const name     = (item?.name || item?.title || '').trim();
      const price    = parseFloat((item?.price || '0').toString().replace(/[^0-9.]/g, ''));
      const imageUrl = item?.image || item?.picUrl || null;

      if (name && name.length > 3) {
        products.push({
          name,
          priceMin:    price || 0,
          priceMax:    price || 0,
          imageUrl,
          darazRating: parseFloat(item?.ratingScore || 0),
          darazOrders: parseInt(item?.reviewCount   || 0, 10),
          category,
          platforms:   ['daraz'],
        });
      }
    }
  } catch {}
  return products;
}

// ─── Strategy 3: JSON-LD ─────────────────────────────────────────────────────

function extractFromJsonLd(html, category) {
  const $ = cheerio.load(html);
  const products = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const entries = Array.isArray(json) ? json : [json];
      for (const entry of entries) {
        if (entry['@type'] !== 'Product') continue;
        const offer = entry.offers || {};
        const name  = (entry.name || '').trim();
        if (!name || name.length < 3) continue;

        // ld+json images can be an array or a single string
        const imageUrl = Array.isArray(entry.image)
          ? entry.image[0]
          : entry.image || null;

        products.push({
          name,
          priceMin:    parseFloat(offer.lowPrice  || offer.price || 0),
          priceMax:    parseFloat(offer.highPrice || offer.price || 0),
          imageUrl,
          darazRating: parseFloat(entry.aggregateRating?.ratingValue || 0),
          darazOrders: 0,
          category,
          platforms:   ['daraz'],
        });
      }
    } catch {}
  });

  return products;
}

// ─── Strategy 4: HTML card selectors ─────────────────────────────────────────

function extractFromHtml(html, category) {
  const $ = cheerio.load(html);
  const products = [];

  // Daraz card selectors (changes over time; try all known variants)
  const cardSelectors = [
    '[data-qa-locator="product-item"]',
    '.c1_t2i',
    '.c2prKC',
    '.c16H9d',
    '.sku-item',
  ];

  for (const sel of cardSelectors) {
    $(sel).each((_, el) => {
      const name = $(el)
        .find('[class*="title"], .c16H9d, [data-qa-locator="product-title"]')
        .first()
        .text()
        .trim();

      const priceText = $(el)
        .find('[class*="price"], .c13VH6, [data-qa-locator="product-price"]')
        .first()
        .text()
        .replace(/[^0-9.]/g, '');

      // Try src, data-src (lazy-load), and srcset
      const imgEl = $(el).find('img').first();
      const imageUrl =
        imgEl.attr('src')      ||
        imgEl.attr('data-src') ||
        (imgEl.attr('srcset') || '').split(' ')[0] ||
        null;

      // Only accept non-placeholder images
      const validImage =
        imageUrl &&
        !imageUrl.startsWith('data:') &&
        imageUrl.startsWith('http')
          ? imageUrl
          : null;

      if (name && name.length > 3) {
        products.push({
          name,
          priceMin:  parseFloat(priceText) || 0,
          priceMax:  parseFloat(priceText) || 0,
          imageUrl:  validImage,
          darazRating: 0,
          darazOrders: 0,
          category,
          platforms: ['daraz'],
        });
      }
    });
    if (products.length > 0) break;
  }

  return products;
}

// ─── Merge & deduplicate ──────────────────────────────────────────────────────

function mergeProducts(lists) {
  const seen = new Map();
  for (const list of lists) {
    for (const p of list) {
      const key = p.name.toLowerCase().slice(0, 40);
      if (!seen.has(key)) {
        seen.set(key, p);
      } else {
        // Merge: prefer non-null imageUrl, higher darazOrders
        const existing = seen.get(key);
        if (!existing.imageUrl && p.imageUrl) existing.imageUrl = p.imageUrl;
        if (p.darazOrders > existing.darazOrders)  existing.darazOrders  = p.darazOrders;
        if (p.darazRating > existing.darazRating)  existing.darazRating  = p.darazRating;
        if (p.priceMin    > existing.priceMin)      existing.priceMin     = p.priceMin;
      }
    }
  }
  return [...seen.values()];
}

// ─── Parse page ───────────────────────────────────────────────────────────────

function parseListings(html, category) {
  const next    = extractFromNextData(html, category);
  const win     = extractFromWindowData(html, category);
  const ld      = extractFromJsonLd(html, category);
  const markup  = extractFromHtml(html, category);

  const merged = mergeProducts([next, win, ld, markup]);
  console.log(
    `[Daraz] Extraction breakdown — __NEXT_DATA__:${next.length} windowData:${win.length} ` +
    `json-ld:${ld.length} html:${markup.length} merged:${merged.length}`
  );
  return merged;
}

// ─── Save to MongoDB ──────────────────────────────────────────────────────────

async function saveProducts(products) {
  let saved = 0;
  let failed = 0;

  for (const p of products) {
    if (!p.name || p.name.length < 3) continue;
    try {
      await Product.findOneAndUpdate(
        { name: p.name, category: p.category },
        {
          $set: {
            ...p,
            // Only update imageUrl if we have a real one
            ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
            lastScrapedAt: new Date(),
          },
          $setOnInsert: { winScore: 0 },
        },
        { upsert: true, new: true }
      );
      saved++;
    } catch (err) {
      failed++;
      console.warn(`[Daraz] Failed to save "${p.name}":`, err.message);
    }
  }

  return { saved, failed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function darazScraper({ category } = {}) {
  await connectDB();

  const targets = category
    ? CATEGORY_URLS.filter((c) => c.category === category)
    : CATEGORY_URLS;

  const allProducts = [];
  let totalSaved = 0;
  let totalFailed = 0;

  for (const target of targets) {
    const url = `${BASE_URL}${target.path}`;
    console.log(`[Daraz] Scraping ${target.category}: ${url}`);

    try {
      const response = await axios.get(url, {
        headers:      buildHeaders(),
        timeout:      20000,
        maxRedirects: 5,
      });

      const products = parseListings(response.data, target.category);
      console.log(`[Daraz] Found ${products.length} products in ${target.category}`);
      allProducts.push(...products);

      if (products.length > 0) {
        const { saved, failed } = await saveProducts(products);
        totalSaved  += saved;
        totalFailed += failed;
      }

    } catch (err) {
      console.error(`[Daraz] Error scraping ${target.category}: ${err.message}`);
    }

    await delay(REQUEST_DELAY_MS + Math.random() * 500);
  }

  console.log(`[Daraz] Done. Saved: ${totalSaved}, Failed: ${totalFailed}, Total found: ${allProducts.length}`);
  return { products: allProducts, saved: totalSaved, failed: totalFailed };
}

export default darazScraper;
