/**
 * Trend Job — runs every 12 hours
 * Executes: Google Trends and News scrapers.
 * One failing does NOT stop the other.
 */

import cron from 'node-cron';
import googleTrendsScraper from '../scrapers/googleTrendsScraper.js';
import newsScraper from '../scrapers/newsScraper.js';

const SCHEDULE = '0 */12 * * *'; // Every 12 hours

async function runTrendJob() {
  const start = new Date();
  console.log(`[${start.toISOString()}] [TrendJob] Starting trend cycle`);

  const scrapers = [
    { name: 'GoogleTrends', fn: () => googleTrendsScraper() },
    { name: 'News',         fn: () => newsScraper() },
  ];

  for (const { name, fn } of scrapers) {
    try {
      console.log(`[${new Date().toISOString()}] [TrendJob] Running ${name}…`);
      const result = await fn();
      console.log(`[${new Date().toISOString()}] [TrendJob] ${name} done:`, JSON.stringify(result));
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [TrendJob] ${name} FAILED: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[${new Date().toISOString()}] [TrendJob] Cycle complete in ${elapsed}s`);
}

export function startTrendJob() {
  console.log(`[TrendJob] Scheduled: ${SCHEDULE} (every 12 hours)`);
  cron.schedule(SCHEDULE, runTrendJob, { timezone: 'Asia/Karachi' });
}

export { runTrendJob };
