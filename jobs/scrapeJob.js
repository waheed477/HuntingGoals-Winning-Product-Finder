/**
 * Scrape Job — runs every 6 hours
 * Executes: Daraz, OLX, TikTok, and Facebook Ads scrapers.
 * One failing does NOT stop the others.
 */

import cron from 'node-cron';
import darazScraper from '../scrapers/darazScraper.js';
import tiktokScraper from '../scrapers/tiktokScraper.js';
import fbAdsScraper from '../scrapers/fbAdsScraper.js';

const SCHEDULE = '0 */6 * * *'; // Every 6 hours

// OLX scraper — dynamic import so a missing file doesn't crash the job
async function tryOlxScraper() {
  try {
    const { default: olxScraper } = await import('../scrapers/olxScraper.js');
    return olxScraper();
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('[ScrapeJob] OLX scraper not found — skipping');
      return null;
    }
    throw err;
  }
}

async function runScrapeJob() {
  const start = new Date();
  console.log(`[${start.toISOString()}] [ScrapeJob] Starting scrape cycle`);

  const scrapers = [
    { name: 'Daraz',        fn: () => darazScraper()    },
    { name: 'OLX',          fn: () => tryOlxScraper()   },
    { name: 'TikTok',       fn: () => tiktokScraper()   },
    { name: 'Facebook Ads', fn: () => fbAdsScraper()    },
  ];

  for (const { name, fn } of scrapers) {
    try {
      console.log(`[ScrapeJob] Running ${name} scraper…`);
      const result = await fn();
      if (result !== null) {
        console.log(`[ScrapeJob] ${name} done:`, JSON.stringify(result));
      }
    } catch (err) {
      console.error(`[ScrapeJob] ${name} FAILED: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[ScrapeJob] Cycle complete in ${elapsed}s`);
}

export function startScrapeJob() {
  console.log(`[ScrapeJob] Scheduled: ${SCHEDULE} (every 6 hours)`);
  cron.schedule(SCHEDULE, runScrapeJob, { timezone: 'Asia/Karachi' });
}

export { runScrapeJob };
