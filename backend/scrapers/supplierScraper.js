/**
 * Supplier Scraper
 * Discovers Pakistani wholesale suppliers from public business directories.
 * Uses puppeteer for JS-rendered pages and cheerio for static parsing.
 * Respects rate limits with random delays between requests.
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import Supplier from '../models/Supplier.js';
import { connectDB } from '../lib/db.js';

const DELAY_MS_MIN = 2000;
const DELAY_MS_MAX = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return sleep(DELAY_MS_MIN + Math.random() * (DELAY_MS_MAX - DELAY_MS_MIN));
}

const CITY_ALIASES = {
  Lahore:     'lahore',
  Karachi:    'karachi',
  Islamabad:  'islamabad',
  Faisalabad: 'faisalabad',
  Rawalpindi: 'rawalpindi',
  Multan:     'multan',
  Peshawar:   'peshawar',
  Quetta:     'quetta',
  Sialkot:    'sialkot',
  Gujranwala: 'gujranwala',
};

const CATEGORY_KEYWORDS = {
  Electronics: ['electronic', 'mobile', 'laptop', 'gadget', 'charger'],
  Fashion:     ['clothing', 'garment', 'textile', 'fabric', 'fashion'],
  Beauty:      ['cosmetic', 'beauty', 'skincare', 'serum', 'makeup'],
  Home:        ['furniture', 'home', 'kitchen', 'appliance', 'decor'],
  Grocery:     ['food', 'grocery', 'spices', 'dry fruit', 'wholesale food'],
  Toys:        ['toy', 'kids', 'children', 'games', 'educational'],
  Sports:      ['sports', 'cricket', 'fitness', 'gym', 'outdoor'],
  Books:       ['books', 'stationery', 'publisher', 'educational material'],
};

/**
 * Detect category from supplier name and products.
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return 'General';
}

/**
 * Scrape suppliers from tradekey.com.pk using puppeteer.
 */
async function scrapeTradekeyPk(browser, city, category) {
  const results = [];
  const keyword = `${(CATEGORY_KEYWORDS[category] || [category.toLowerCase()])[0]} ${city}`;
  const url = `https://www.tradekey.com/search/?k=${encodeURIComponent(keyword)}&country=PK`;

  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    await page.setDefaultNavigationTimeout(20000);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const html = await page.content();
    const $ = cheerio.load(html);

    $('div.company, .search-result-item, .company-listing').each((_, el) => {
      const name    = $(el).find('.company-name, h3, h2, .name').first().text().trim();
      const phone   = $(el).find('.phone, .contact-phone, [class*="phone"]').first().text().trim();
      const website = $(el).find('a[href*="http"]').attr('href') || null;
      const address = $(el).find('.address, .location, [class*="address"]').first().text().trim();

      if (!name || name.length < 3) return;

      results.push({
        name:     name.slice(0, 120),
        city,
        category: detectCategory(name + ' ' + address),
        phone:    phone || null,
        website:  website || null,
        address:  address || null,
        products: [category],
        sourceUrl: url,
        verified: false,
      });
    });
  } catch (err) {
    console.warn(`[SupplierScraper] tradekey scrape failed for "${keyword}": ${err.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return results;
}

/**
 * Scrape from pakistanibusiness.com.pk style directories using cheerio.
 */
async function scrapeBusinessDirectory(browser, city, category) {
  const results = [];
  const keyword = `${CATEGORY_KEYWORDS[category]?.[0] || category} supplier ${city}`;
  const url = `https://www.pakistanibusiness.com/?s=${encodeURIComponent(keyword)}`;

  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36'
    );
    await page.setDefaultNavigationTimeout(15000);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const html = await page.content();
    const $ = cheerio.load(html);

    $('article, .business-card, .listing-item, .entry').each((_, el) => {
      const name    = $(el).find('h2, h3, .title, .business-name').first().text().trim();
      const phone   = $(el).find('.phone, [href^="tel:"]').first().text().replace('tel:', '').trim();
      const address = $(el).find('.address, .location').first().text().trim();
      const link    = $(el).find('a').first().attr('href') || null;

      if (!name || name.length < 3) return;

      results.push({
        name:     name.slice(0, 120),
        city,
        category: detectCategory(name),
        phone:    phone || null,
        website:  link || null,
        address:  address || null,
        products: [category],
        sourceUrl: url,
        verified: false,
      });
    });
  } catch (err) {
    console.warn(`[SupplierScraper] businessdirectory failed for "${keyword}": ${err.message}`);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return results;
}

/**
 * Main export: scrape suppliers across cities × categories combos.
 * @param {{ cities: string[], categories: string[] }} opts
 * @returns {Promise<{ saved: number, skipped: number, errors: string[] }>}
 */
export async function scrapeSuppliers({ cities = ['Lahore'], categories = ['Electronics'] } = {}) {
  await connectDB();

  let browser;
  const errors = [];
  let saved   = 0;
  let skipped = 0;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.CHROMIUM_PATH || '/run/current-system/sw/bin/chromium',
    });

    for (const city of cities) {
      for (const category of categories) {
        console.log(`[SupplierScraper] Scraping ${category} suppliers in ${city}…`);

        const batches = await Promise.allSettled([
          scrapeTradekeyPk(browser, city, category),
          scrapeBusinessDirectory(browser, city, category),
        ]);

        const raw = batches.flatMap((b) => (b.status === 'fulfilled' ? b.value : []));

        for (const supplier of raw) {
          try {
            const exists = await Supplier.findOne({
              name: { $regex: new RegExp(`^${supplier.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              city: supplier.city,
            });

            if (exists) {
              skipped++;
              continue;
            }

            await Supplier.create(supplier);
            saved++;
          } catch (saveErr) {
            errors.push(`Save failed for "${supplier.name}": ${saveErr.message}`);
          }
        }

        await randomDelay();
      }
    }
  } catch (err) {
    console.error('[SupplierScraper] Fatal error:', err.message);
    errors.push(err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log(`[SupplierScraper] Done: saved=${saved} skipped=${skipped} errors=${errors.length}`);
  return { saved, skipped, errors };
}

export default scrapeSuppliers;
