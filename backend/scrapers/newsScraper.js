/**
 * Pakistan News Scraper
 * Parses RSS feeds from major Pakistani business/tech publications.
 * No API key required — works directly with public RSS XML feeds.
 *
 * Sources:
 *   - Dawn Business: https://www.dawn.com/feeds/business
 *   - ProPakistani: https://propakistani.pk/feed/
 *   - TechJuice: https://www.techjuice.pk/feed
 *
 * Filters for articles containing demand/trend/market keywords.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_SIGNALS = 20;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// RSS feed sources (no auth required)
const NEWS_SOURCES = [
  {
    name: 'Dawn Business',
    url: 'https://www.dawn.com/feeds/business',
    type: 'rss',
  },
  {
    name: 'ProPakistani',
    url: 'https://propakistani.pk/feed/',
    type: 'rss',
  },
  {
    name: 'TechJuice',
    url: 'https://www.techjuice.pk/feed',
    type: 'rss',
  },
];

// Keywords that signal market demand or product opportunities
const SIGNAL_KEYWORDS = [
  'import',
  'demand',
  'shortage',
  'market trend',
  'winning product',
  'surge',
  'e-commerce',
  'ecommerce',
  'online shopping',
  'daraz',
  'olx',
  'supply chain',
  'product launch',
  'growth',
  'sales spike',
  'export ban',
  'import ban',
  'price hike',
  'cheap',
  'affordable',
];

// Product-adjacent terms to extract from headlines
const PRODUCT_HINT_PATTERNS = [
  /\b(mobile|phone|smartphone|laptop|tablet|gadget|device)\b/i,
  /\b(fabric|cloth|clothing|garment|textile|fashion|suit|shirt|kurta)\b/i,
  /\b(heater|cooler|ac|air conditioner|fan|appliance)\b/i,
  /\b(food|grocery|vegetable|fruit|commodity)\b/i,
  /\b(beauty|cosmetic|skincare|serum|cream)\b/i,
  /\b(toy|game|kids|children)\b/i,
  /\b(shoe|footwear|sandal|slipper)\b/i,
  /\b(bag|purse|handbag|backpack)\b/i,
  /\b(electronics|equipment|hardware)\b/i,
];

/**
 * Build request headers for RSS fetching.
 * @returns {Object}
 */
function buildHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (compatible; TrendSpy-NewsBot/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.5',
  };
}

/**
 * Parse an RSS XML feed using cheerio.
 * @param {string} xml - Raw RSS XML content
 * @param {string} sourceName - Human-readable source name
 * @returns {Array<{ title: string, link: string, pubDate: Date|null, description: string }>}
 */
function parseRssFeed(xml, sourceName) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];

  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().trim();
    const link = $(el).find('link').first().text().trim()
      || $(el).find('guid').first().text().trim();
    const pubDateRaw = $(el).find('pubDate').first().text().trim();
    const descriptionRaw = $(el).find('description').first().text().trim();

    // Strip HTML from description
    const description = cheerio.load(descriptionRaw).text().trim().slice(0, 500);

    let pubDate = null;
    if (pubDateRaw) {
      try { pubDate = new Date(pubDateRaw); } catch {}
    }

    if (title && title.length > 5) {
      items.push({ title, link, pubDate, description, source: sourceName });
    }
  });

  return items;
}

/**
 * Score an article based on how many signal keywords appear in its text.
 * @param {string} text
 * @returns {number}
 */
function signalScore(text) {
  const lower = text.toLowerCase();
  return SIGNAL_KEYWORDS.filter((kw) => lower.includes(kw)).length;
}

/**
 * Extract product hints from an article headline/description.
 * @param {string} text
 * @returns {string[]}
 */
function extractProductHints(text) {
  const hints = [];
  for (const pattern of PRODUCT_HINT_PATTERNS) {
    const match = text.match(pattern);
    if (match) hints.push(match[0].toLowerCase());
  }
  return [...new Set(hints)];
}

/**
 * Fetch and parse a single RSS feed.
 * @param {{ name: string, url: string }} source
 * @returns {Promise<Array>}
 */
async function fetchFeed(source) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [News] Fetching: ${source.name} (${source.url})`);

  try {
    const response = await axios.get(source.url, {
      headers: buildHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
    });

    const items = parseRssFeed(response.data, source.name);
    console.log(`[News] ${source.name}: parsed ${items.length} articles`);
    return items;
  } catch (err) {
    console.error(`[News] Error fetching ${source.name}:`, err.message);
    return [];
  }
}

/**
 * Main scraper function.
 * @param {{ sources?: string[] }} options - Optionally filter by source name
 * @returns {Promise<{ signals: Array, total: number }>}
 */
async function newsScraper({ sources } = {}) {
  const targets = sources
    ? NEWS_SOURCES.filter((s) => sources.includes(s.name))
    : NEWS_SOURCES;

  const allItems = [];

  for (const source of targets) {
    const items = await fetchFeed(source);
    allItems.push(...items);
    await delay(1000 + Math.random() * 500);
  }

  // Filter and score articles by signal keywords
  const scored = allItems
    .map((item) => {
      const fullText = `${item.title} ${item.description}`;
      const score = signalScore(fullText);
      const productHints = extractProductHints(fullText);
      return { ...item, signalScore: score, productHints };
    })
    .filter((item) => item.signalScore > 0)
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, MAX_SIGNALS);

  console.log(
    `[News] Done. Total articles: ${allItems.length}, Signals found: ${scored.length}`
  );

  return { signals: scored, total: scored.length };
}

export default newsScraper;
