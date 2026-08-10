/**
 * CLI script to run the real supplier scraper.
 * Usage:
 *   node scripts/runSupplierScraper.js
 *   node scripts/runSupplierScraper.js --cities Lahore,Karachi --categories Electronics,Fashion
 */

import { runSupplierScraper } from '../scrapers/realSupplierScraper.js';
import { connectDB } from '../lib/db.js';

function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return null;
}

async function main() {
  const cities     = parseArg('cities');
  const categories = parseArg('categories');

  const opts = {};
  if (cities)     opts.cities     = cities;
  if (categories) opts.categories = categories;

  console.log('🚀 TrendSpy — Real Supplier Scraper');
  console.log('====================================');
  if (cities)     console.log(`Cities:     ${cities.join(', ')}`);
  if (categories) console.log(`Categories: ${categories.join(', ')}`);
  if (!cities && !categories) console.log('Running full scrape (all cities × all categories)');
  console.log('');

  await connectDB();

  const start = Date.now();
  const result = await runSupplierScraper(opts);
  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);

  console.log('\n====================================');
  console.log(`✅ Done in ${elapsed} minutes`);
  console.log(`   Total found : ${result.totalFound}`);
  console.log(`   Saved       : ${result.saved}`);
  console.log(`   Skipped     : ${result.skipped}`);
  console.log(`   Errors      : ${result.errors.length}`);
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
