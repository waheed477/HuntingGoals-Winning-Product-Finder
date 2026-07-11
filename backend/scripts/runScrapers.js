/**
 * Manual scraper runner.
 * Runs all 4 scrapers sequentially. One failure does NOT stop the others.
 *
 * Usage:
 *   node scripts/runScrapers.js
 *   node scripts/runScrapers.js --scraper=daraz
 *   node scripts/runScrapers.js --scraper=olx --city=Lahore
 */

// Load env vars from .env.local for standalone execution
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

// Dynamic imports after env is loaded
const { connectDB } = await import('../lib/db.js');
const darazScraper      = (await import('../scrapers/darazScraper.js')).default;
const olxScraper        = (await import('../scrapers/olxScraper.js')).default;
const fbAdsScraper      = (await import('../scrapers/fbAdsScraper.js')).default;
const googleTrendsScraper = (await import('../scrapers/googleTrendsScraper.js')).default;

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('='))
);

const SCRAPERS = {
  daraz:  async () => darazScraper({ category: args.category }),
  olx:    async () => olxScraper({ city: args.city, category: args.category }),
  fb:     async () => fbAdsScraper({ searchTerm: args.term, category: args.category }),
  trends: async () => googleTrendsScraper({ days: parseInt(args.days || '30', 10) }),
};

function ts() {
  return new Date().toISOString();
}

async function runScraper(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${ts()}] 🚀 Starting scraper: ${name.toUpperCase()}`);
  console.log('='.repeat(60));

  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[${ts()}] ✅ ${name.toUpperCase()} completed in ${elapsed}s`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
    return { name, success: true, result, elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`[${ts()}] ❌ ${name.toUpperCase()} FAILED after ${elapsed}s: ${err.message}`);
    return { name, success: false, error: err.message, elapsed };
  }
}

async function main() {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`  TrendSpy Scraper Runner — ${ts()}`);
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
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(10)} — ${r.elapsed}s — ${r.success ? 'OK' : r.error}`);
  }
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
