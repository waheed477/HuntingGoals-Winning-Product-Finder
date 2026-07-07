/**
 * Real Supplier Scraper for TrendSpy
 * Scrapes actual supplier data from Pakistani business directories.
 * Sources: Tradekey, YellowPages.pk, PakBiz, FindPK
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import Supplier from '../models/Supplier.js';
import { connectDB } from '../lib/db.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];

const CATEGORIES = ['Electronics', 'Fashion', 'Beauty', 'Home', 'Sports', 'Grocery'];

const CATEGORY_MAP = {
  Hardware: 'General',
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min = 2000, max = 5000) {
  return delay(min + Math.random() * (max - min));
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function normalizePhone(raw) {
  if (!raw) return null;
  const match = raw.match(/[\+]?[0-9]{1,4}?[-.\s]?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,7}/);
  return match ? match[0].trim() : null;
}

function normalizeCategory(cat) {
  return CATEGORY_MAP[cat] || cat;
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    executablePath: process.env.CHROMIUM_PATH || '/run/current-system/sw/bin/chromium',
  });
}

async function fetchPage(browser, url, waitMs = 2500) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(getRandomUserAgent());
    await page.setDefaultNavigationTimeout(25000);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await delay(waitMs);
    const html = await page.content();
    return html;
  } finally {
    await page.close().catch(() => {});
  }
}

// ─── Tradekey.com ────────────────────────────────────────────────────────────
async function scrapeTradekey(browser, city, category) {
  const suppliers = [];
  const keyword = `${category} suppliers ${city} Pakistan`;
  const url = `https://www.tradekey.com/search/?k=${encodeURIComponent(keyword)}&country=PK`;

  try {
    const html = await fetchPage(browser, url, 3000);
    const $ = cheerio.load(html);

    $('div.company, .search-result-item, .company-listing, .result-item, article').each((i, el) => {
      if (i >= 10) return false;
      const name    = $(el).find('.company-name, .title, h3, h2, .name').first().text().trim();
      const phone   = normalizePhone($(el).find('.phone, .contact-phone, [class*="phone"]').first().text());
      const website = $(el).find('a[href^="http"]').attr('href') || null;
      const address = $(el).find('.address, .location, [class*="address"]').first().text().trim();

      if (!name || name.length < 3) return;
      suppliers.push({ name: name.slice(0, 100), city, category: normalizeCategory(category), phone, website, address: address || null, sourceUrl: url, verified: false });
    });

    console.log(`  [Tradekey] ${city}/${category}: ${suppliers.length} found`);
  } catch (err) {
    console.warn(`  [Tradekey] ${city}/${category} error: ${err.message}`);
  }

  return suppliers;
}

// ─── YellowPages.pk ──────────────────────────────────────────────────────────
async function scrapeYellowPages(browser, city, category) {
  const suppliers = [];
  const url = `https://www.yellowpages.pk/search?q=${encodeURIComponent(category)}&l=${encodeURIComponent(city)}`;

  try {
    const html = await fetchPage(browser, url, 2500);
    const $ = cheerio.load(html);

    $('.listing-item, .business-item, .result, .company-row, .listing').each((i, el) => {
      if (i >= 10) return false;
      const name    = $(el).find('.business-name, .title, h3, h2').first().text().trim();
      const phone   = normalizePhone($(el).find('.phone, .tel, [href^="tel:"]').first().text());
      const address = $(el).find('.address, .location').first().text().trim();

      if (!name || name.length < 3) return;
      suppliers.push({ name: name.slice(0, 100), city, category: normalizeCategory(category), phone, address: address || null, sourceUrl: url, verified: false });
    });

    console.log(`  [YellowPages] ${city}/${category}: ${suppliers.length} found`);
  } catch (err) {
    console.warn(`  [YellowPages] ${city}/${category} error: ${err.message}`);
  }

  return suppliers;
}

// ─── PakBiz.com ──────────────────────────────────────────────────────────────
async function scrapePakBiz(browser, city, category) {
  const suppliers = [];
  const url = `https://www.pakbiz.com/business/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent(category.toLowerCase())}/`;

  try {
    const html = await fetchPage(browser, url, 2500);
    const $ = cheerio.load(html);

    $('.company, .listing, .item, .business-card, article').each((i, el) => {
      if (i >= 10) return false;
      const name    = $(el).find('h3, h2, .name, .title').first().text().trim();
      const phone   = normalizePhone($(el).find('.phone, .contact, [href^="tel:"]').first().text());
      const address = $(el).find('.address, .location').first().text().trim();

      if (!name || name.length < 3) return;
      suppliers.push({ name: name.slice(0, 100), city, category: normalizeCategory(category), phone, address: address || null, sourceUrl: url, verified: false });
    });

    console.log(`  [PakBiz] ${city}/${category}: ${suppliers.length} found`);
  } catch (err) {
    console.warn(`  [PakBiz] ${city}/${category} error: ${err.message}`);
  }

  return suppliers;
}

// ─── FindPK.com ───────────────────────────────────────────────────────────────
async function scrapeFindPK(browser, city, category) {
  const suppliers = [];
  const url = `https://findpk.com/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent(category.toLowerCase())}/`;

  try {
    const html = await fetchPage(browser, url, 2000);
    const $ = cheerio.load(html);

    $('.business, .entry, .listing, article, .item').each((i, el) => {
      if (i >= 10) return false;
      const name    = $(el).find('.title, h2, h3, .name').first().text().trim();
      const phone   = normalizePhone($(el).find('.phone, .tel, [href^="tel:"]').first().text());
      const address = $(el).find('.address, .location').first().text().trim();

      if (!name || name.length < 3) return;
      suppliers.push({ name: name.slice(0, 100), city, category: normalizeCategory(category), phone, address: address || null, sourceUrl: url, verified: false });
    });

    console.log(`  [FindPK] ${city}/${category}: ${suppliers.length} found`);
  } catch (err) {
    console.warn(`  [FindPK] ${city}/${category} error: ${err.message}`);
  }

  return suppliers;
}

// ─── Deduplicate ─────────────────────────────────────────────────────────────
function deduplicate(suppliers) {
  const seen = new Set();
  return suppliers.filter((s) => {
    const key = `${s.name.toLowerCase()}|${s.city}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
export async function scrapeAllSuppliers({ cities = CITIES, categories = CATEGORIES } = {}) {
  console.log('🕸️  Starting REAL supplier scraper...');
  console.log(`   Cities: ${cities.join(', ')}`);
  console.log(`   Categories: ${categories.join(', ')}`);

  await connectDB();

  let browser;
  let totalFound = 0;
  let saved = 0;
  let skipped = 0;
  const errors = [];

  try {
    browser = await launchBrowser();

    for (const city of cities) {
      for (const category of categories) {
        console.log(`\n📍 Scraping: ${city} — ${category}`);

        try {
          const [tradekeyResults, yellowPagesResults, pakbizResults, findpkResults] = await Promise.allSettled([
            scrapeTradekey(browser, city, category),
            scrapeYellowPages(browser, city, category),
            scrapePakBiz(browser, city, category),
            scrapeFindPK(browser, city, category),
          ]);

          const combined = [
            ...(tradekeyResults.status === 'fulfilled' ? tradekeyResults.value : []),
            ...(yellowPagesResults.status === 'fulfilled' ? yellowPagesResults.value : []),
            ...(pakbizResults.status === 'fulfilled' ? pakbizResults.value : []),
            ...(findpkResults.status === 'fulfilled' ? findpkResults.value : []),
          ];

          const unique = deduplicate(combined);
          totalFound += unique.length;
          console.log(`  ✅ ${unique.length} unique suppliers for ${city}/${category}`);

          for (const supplier of unique) {
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

          await randomDelay(4000, 7000);
        } catch (err) {
          console.error(`  ❌ Failed for ${city}/${category}: ${err.message}`);
          errors.push(`${city}/${category}: ${err.message}`);
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log(`\n📊 Scraping complete! Found: ${totalFound} | Saved: ${saved} | Skipped: ${skipped} | Errors: ${errors.length}`);
  return { totalFound, saved, skipped, errors };
}

export async function runSupplierScraper(opts = {}) {
  return scrapeAllSuppliers(opts);
}

export default runSupplierScraper;
