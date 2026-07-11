/**
 * Facebook Ads Job — runs every 12 hours
 * Executes the Facebook Ad Library scraper and emits a socket event
 * when new ads are found.
 */

import cron from 'node-cron';
import { scrapeFacebookAds } from '../scrapers/fbAdsScraper.js';
import { emitNewAdsDetected } from '../lib/socketEmitter.js';

const SCHEDULE = '0 */12 * * *'; // Every 12 hours

const CATEGORIES = [
  { term: 'Electronics Pakistan', category: 'Electronics' },
  { term: 'Fashion Pakistan',     category: 'Fashion'     },
  { term: 'Beauty Pakistan',      category: 'Beauty'      },
  { term: 'Home appliances Pakistan', category: 'Home'    },
  { term: 'Sports Pakistan',      category: 'Sports'      },
];

async function runFbAdsJob() {
  const start = new Date();
  console.log(`[${start.toISOString()}] [FbAdsJob] Scraping Facebook Ad Library…`);

  let totalFound = 0;
  let totalSaved = 0;
  const categoriesWithNewAds = [];

  for (const { term, category } of CATEGORIES) {
    try {
      const result = await scrapeFacebookAds(term, category);
      totalFound += result.totalFound;
      totalSaved += result.savedNew;
      if (result.savedNew > 0) categoriesWithNewAds.push(category);
    } catch (err) {
      console.error(`[FbAdsJob] Failed for "${term}": ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`[${new Date().toISOString()}] [FbAdsJob] Done. totalFound=${totalFound} savedNew=${totalSaved}`);

  if (totalSaved > 0) {
    emitNewAdsDetected({ count: totalSaved, categories: categoriesWithNewAds, totalFound }).catch(() => {});
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${new Date().toISOString()}] [FbAdsJob] Cycle complete in ${elapsed}s`);
}

export function startFbAdsJob() {
  console.log(`[FbAdsJob] Scheduled: ${SCHEDULE} (every 12 hours)`);
  cron.schedule(SCHEDULE, runFbAdsJob, { timezone: 'Asia/Karachi' });
}

export { runFbAdsJob };
