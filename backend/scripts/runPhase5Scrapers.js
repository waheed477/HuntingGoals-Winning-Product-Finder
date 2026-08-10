/**
 * Phase 5 Scraper Runner
 * Runs TikTok and News scrapers sequentially.
 * One failing does NOT stop the other.
 *
 * Usage:
 *   node scripts/runPhase5Scrapers.js
 *   node scripts/runPhase5Scrapers.js --scraper=tiktok
 *   node scripts/runPhase5Scrapers.js --scraper=news
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const { connectDB } = await import('../lib/db.js');
const tiktokScraper = (await import('../scrapers/tiktokScraper.js')).default;
const newsScraper   = (await import('../scrapers/newsScraper.js')).default;

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('='))
);

const SCRAPERS = {
  tiktok: async () => tiktokScraper({ region: args.region || 'PK' }),
  news:   async () => newsScraper(),
};

function ts() {
  return new Date().toISOString();
}

async function runScraper(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${ts()}] Starting scraper: ${name.toUpperCase()}`);
  console.log('='.repeat(60));

  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${ts()}] ${name.toUpperCase()} completed in ${elapsed}s`);
    console.log('Result:', JSON.stringify(result, null, 2));
    return { name, success: true, result, elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`[${ts()}] ${name.toUpperCase()} FAILED after ${elapsed}s: ${err.message}`);
    return { name, success: false, error: err.message, elapsed };
  }
}

async function main() {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`  TrendSpy Phase 5 Scrapers — ${ts()}`);
  console.log(`${'#'.repeat(60)}\n`);

  await connectDB();

  const targetScraper = args.scraper;
  const scraperNames = targetScraper
    ? [targetScraper].filter((n) => SCRAPERS[n])
    : Object.keys(SCRAPERS);

  if (scraperNames.length === 0) {
    console.error(`Unknown scraper: "${targetScraper}". Available: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  for (const name of scraperNames) {
    const result = await runScraper(name, SCRAPERS[name]);
    results.push(result);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const status = r.success ? 'OK' : `FAILED — ${r.error}`;
    console.log(`${r.success ? '[OK]' : '[FAIL]'} ${r.name.padEnd(10)} — ${r.elapsed}s — ${status}`);
  }
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
