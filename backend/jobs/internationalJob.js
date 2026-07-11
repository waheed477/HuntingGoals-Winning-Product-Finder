/**
 * International Job
 * Periodically scrapes Shopify stores and Google Shopping for global product data.
 * Schedule: every 12 hours (configurable via INTERNATIONAL_SCRAPE_SCHEDULE).
 * Guards: GOOGLE_SHOPPING_ENABLED and SHOPIFY_SCRAPER_ENABLED env flags.
 */

import cron from 'node-cron';
import { scrapeGoogleShopping } from '../scrapers/googleShoppingScraper.js';
import { scrapeShopifyProducts } from '../scrapers/shopifyProductScraper.js';

const SCHEDULE = process.env.INTERNATIONAL_SCRAPE_SCHEDULE || '0 */12 * * *';
const CATEGORIES = ['Electronics', 'Fashion', 'Beauty', 'Home', 'General'];

async function runInternationalJob() {
  const start = new Date();
  console.log(`[${start.toISOString()}] [InternationalJob] Starting international scrape…`);

  const googleEnabled  = process.env.GOOGLE_SHOPPING_ENABLED  === 'true';
  const shopifyEnabled = process.env.SHOPIFY_SCRAPER_ENABLED   === 'true';

  if (!googleEnabled && !shopifyEnabled) {
    console.log('[InternationalJob] Both scrapers disabled. Set GOOGLE_SHOPPING_ENABLED=true and/or SHOPIFY_SCRAPER_ENABLED=true.');
    return;
  }

  let totalSaved = 0;

  for (const category of CATEGORIES) {
    if (googleEnabled) {
      try {
        const { saved } = await scrapeGoogleShopping(category.toLowerCase(), 20);
        totalSaved += saved;
        console.log(`[InternationalJob] Google Shopping "${category}": ${saved} saved`);
      } catch (err) {
        console.error(`[InternationalJob] Google Shopping "${category}" failed: ${err.message}`);
      }
    }

    if (shopifyEnabled) {
      try {
        const { saved } = await scrapeShopifyProducts(category, 30);
        totalSaved += saved;
        console.log(`[InternationalJob] Shopify "${category}": ${saved} saved`);
      } catch (err) {
        console.error(`[InternationalJob] Shopify "${category}" failed: ${err.message}`);
      }
    }
  }

  const elapsed = ((Date.now() - start.getTime()) / 1000).toFixed(1);
  console.log(`[${new Date().toISOString()}] [InternationalJob] Done in ${elapsed}s — totalSaved=${totalSaved}`);
}

export function startInternationalJob() {
  console.log(`[InternationalJob] Scheduled (${SCHEDULE}).`);
  cron.schedule(SCHEDULE, runInternationalJob);
}

export { runInternationalJob };
