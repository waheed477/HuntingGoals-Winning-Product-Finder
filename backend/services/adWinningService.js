/**
 * Ad-Based Winning Product Detection
 *
 * Uses ONLY real scraped Facebook Ad Library data.
 * Groups ads by category → clusters by advertiser → scores by:
 *   - Advertiser diversity  (40 pts)  — many sellers = hot product
 *   - Volume                (30 pts)  — total ads in window
 *   - Longevity             (20 pts)  — 30+ days running = proven winner
 *   - Spend level           (10 pts)  — high spend = profitable product
 *
 * Supports optional city and season filters.
 */

import { connectDB }   from '../lib/db.js';
import { ScrapedAd }   from '../models/index.js';
import { extractCity } from '../lib/extractCity.js';

const WINDOW_DAYS   = 7;
const VALID_SEASONS = new Set(['winter', 'summer', 'ramadan', 'wedding', 'backToSchool', 'general']);

const NOISE_RE = /limited\s*time|flash\s*sale|sale|offer|buy\s*now|shop\s*now|free\s*shipping|order\s*now|discount|off|get\s*yours|hurry|don['']t\s*miss|check\s*out|click\s*here|learn\s*more|whatsapp|whats\s*app|cod\s*available|cash\s*on\s*delivery|nationwide\s*delivery|same\s*day|home\s*delivery|\d+%|rs\.?\s*\d+|pkr\s*\d+|pk|pakistan/gi;

const GENERIC_WORDS = new Set([
  'love','our','you','know','non','stop','get','new','best','top','the','for',
  'and','with','your','this','that','more','all','now','buy','fast','good',
  'great','big','just','only','very','much','also','some','come','want','need',
  'give','take','make','like','look','see','use','can','has','had','not','but',
  'are','was','were','will','have','been','its','any','one','two','how','why',
  'who','day','time','way','may','per','yet','via','get','free','cod','home',
  'order','shop','price','brand','original','quality','latest','new','sale',
  'collection','made','style','designs','design','color','colors','size','sizes',
  'stock','available','delivery','shipping','nationwide','introducing','meet',
  'smart','smartness','amazing','awesome','perfect','ideal','ultimate','premium',
  'nayi','wali','purani','jadoo','karo','hai','mein','kar','kal','aaj',
  'sirf','abhi','hain','nahi','bhi','toh','se','ki','ka','ko','ne','par',
  'agar','phir','kuch','yeh','woh','aur','lekin','kyun','jab','sab',
]);

function cleanHeadline(headline, words = 6) {
  if (!headline) return '';
  return headline
    .replace(NOISE_RE, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, words)
    .join(' ')
    .toLowerCase();
}

function baseMatch(since, city, season) {
  const m = {
    scrapedAt: { $gte: since },
    isActive:  true,
    category:  { $ne: null, $exists: true },
    headline:  { $ne: null, $exists: true },
  };
  if (city)                              m.city   = city;
  if (season && season !== 'general' && VALID_SEASONS.has(season)) m.season = season;
  return m;
}

async function getCategorySignals(since, city, season) {
  return ScrapedAd.aggregate([
    { $match: baseMatch(since, city, season) },
    {
      $group: {
        _id:              '$category',
        uniqueAdv:        { $addToSet: '$advertiserName' },
        totalAds:         { $sum: 1 },
        maxDays:          { $max: '$daysRunning' },
        avgDays:          { $avg: '$daysRunning' },
        spendSum:         { $sum: { $cond: [{ $eq: ['$spendLevel', 'high'] }, 1, 0] } },
        headlines:        { $push: '$headline' },
        platforms:        { $addToSet: '$platform' },
        sampleDirectUrls: { $push: '$directUrl' },
        seasons:          { $push: '$season' },
      },
    },
    { $addFields: { advCount: { $size: '$uniqueAdv' } } },
    { $sort: { advCount: -1, totalAds: -1 } },
    { $limit: 30 },
  ]);
}

async function getTopAdvertisers(category, since, city, season, limit = 3) {
  const m = { ...baseMatch(since, city, season), category };
  return ScrapedAd.aggregate([
    { $match: m },
    {
      $group: {
        _id:       '$advertiserName',
        adCount:   { $sum: 1 },
        maxDays:   { $max: '$daysRunning' },
        spendSum:  { $sum: { $cond: [{ $eq: ['$spendLevel', 'high'] }, 1, 0] } },
        headlines: { $push: '$headline' },
        directUrl: { $first: '$directUrl' },
      },
    },
    { $sort: { adCount: -1, maxDays: -1 } },
    { $limit: limit },
  ]);
}

function scoreCategory({ advCount, totalAds, maxDays, spendSum }) {
  let s = 0;
  s += Math.min(40, advCount * 8);
  s += Math.min(30, Math.round(totalAds / 2));
  s += maxDays >= 30 ? 20 : maxDays >= 14 ? 10 : maxDays >= 7 ? 5 : 0;
  s += Math.min(10, spendSum * 2);
  return Math.min(100, s);
}

function extractTopKeyword(headlines, category) {
  const freq = {};
  for (const h of headlines) {
    const words = cleanHeadline(h, 8)
      .split(' ')
      .filter((w) => w.length > 2 && !GENERIC_WORDS.has(w));
    for (let i = 0; i < words.length - 1; i++) {
      if (GENERIC_WORDS.has(words[i]) || GENERIC_WORDS.has(words[i + 1])) continue;
      const bigram = `${words[i]} ${words[i + 1]}`;
      freq[bigram] = (freq[bigram] || 0) + 1;
    }
  }

  const candidates = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (candidates.length > 0) {
    return candidates[0][0].replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const wordFreq = {};
  for (const h of headlines) {
    const words = cleanHeadline(h, 8)
      .split(' ')
      .filter((w) => w.length > 3 && !GENERIC_WORDS.has(w));
    for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
  }
  const topWord = Object.entries(wordFreq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])[0];

  if (topWord) return topWord[0].replace(/\b\w/g, (c) => c.toUpperCase());
  return category || 'Trending Products';
}

/** Pick the most frequent season label from an array of season strings. */
function dominantSeason(seasons) {
  if (!seasons || seasons.length === 0) return 'general';
  const freq = {};
  for (const s of seasons) freq[s] = (freq[s] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Backfill season field on existing ads ─────────────────────────────────────

let _seasonBackfillDone = false;

export async function backfillSeasons() {
  if (_seasonBackfillDone) return;
  _seasonBackfillDone = true;
  await connectDB();

  // Only backfill ads that still carry the default 'general' and have a headline to analyse
  const ads = await ScrapedAd.find(
    { season: 'general', headline: { $exists: true, $ne: '' } },
    { _id: 1, headline: 1, description: 1, productName: 1, advertiserName: 1 }
  ).limit(5000).lean();

  if (ads.length === 0) return;

  // Lazy-import to avoid circular deps (seasonalKeywords → nothing)
  const { detectSeason } = await import('../data/seasonalKeywords.js');

  const ops = [];
  let tagged = 0;

  for (const ad of ads) {
    const text   = [ad.headline, ad.description, ad.productName, ad.advertiserName].filter(Boolean).join(' ');
    const season = detectSeason(text);
    if (season !== 'general') {
      ops.push({ updateOne: { filter: { _id: ad._id }, update: { $set: { season } } } });
      tagged++;
    }
  }

  if (ops.length > 0) {
    await ScrapedAd.bulkWrite(ops, { ordered: false });
    console.log(`[adWinningService] Backfilled season on ${tagged}/${ads.length} ads`);
  } else {
    console.log(`[adWinningService] Season backfill: ${ads.length} ads remain general (no keyword match)`);
  }
}

// ── Backfill city field on existing ads ──────────────────────────────────────

let _backfillDone = false;

export async function backfillCities() {
  if (_backfillDone) return;
  _backfillDone = true;
  await connectDB();

  const ads = await ScrapedAd.find(
    { city: null },
    { _id: 1, headline: 1, description: 1, advertiserName: 1 }
  ).lean();

  if (ads.length === 0) return;

  const ops = [];
  let tagged = 0;

  for (const ad of ads) {
    const city = extractCity(ad.headline, ad.description, ad.advertiserName);
    if (city) {
      ops.push({ updateOne: { filter: { _id: ad._id }, update: { $set: { city } } } });
      tagged++;
    }
  }

  if (ops.length > 0) {
    await ScrapedAd.bulkWrite(ops, { ordered: false });
    console.log(`[adWinningService] Backfilled city field on ${tagged}/${ads.length} ads`);
  }
}

// ── City coverage breakdown ───────────────────────────────────────────────────

export async function getCityCoverage() {
  await connectDB();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await ScrapedAd.aggregate([
    { $match: { scrapedAt: { $gte: since }, isActive: true, city: { $ne: null } } },
    { $group: { _id: '$city', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
}

// ── Clean up fake / invalid ad IDs ───────────────────────────────────────────

let _cleanFakeAdsDone = false;

/**
 * One-time in-process cleanup.
 * Deletes any ScrapedAd whose adId is not a real 10+ digit numeric Facebook ID.
 * Covers seeded test data, old "dom_XXXXX" entries, and any other synthetic IDs.
 */
export async function cleanFakeAds() {
  if (_cleanFakeAdsDone) return;
  _cleanFakeAdsDone = true;
  await connectDB();

  // Match any adId that is NOT a pure numeric string of at least 10 digits
  const result = await ScrapedAd.deleteMany({
    adId: { $not: /^[0-9]{10,}$/ },
  });

  if (result.deletedCount > 0) {
    console.log(`[adWinningService] Removed ${result.deletedCount} ad(s) with fake/invalid adIds`);
  }
}

// ── Season coverage breakdown ─────────────────────────────────────────────────

export async function getSeasonCoverage() {
  await connectDB();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await ScrapedAd.aggregate([
    { $match: { scrapedAt: { $gte: since }, isActive: true } },
    { $group: { _id: '$season', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id || 'general', r.count]));
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Return winning product clusters from real Facebook Ad Library data.
 * @param {number}      limit   Max results
 * @param {string|null} city    Optional city filter
 * @param {string|null} season  Optional season filter (winter|summer|ramadan|wedding|backToSchool)
 */
export async function getAdBasedWinners(limit = 20, city = null, season = null) {
  await connectDB();

  const since      = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const categories = await getCategorySignals(since, city, season);

  if (categories.length === 0) return [];

  const results = await Promise.all(
    categories.map(async (cat) => {
      const topAdvs = await getTopAdvertisers(cat._id, since, city, season, 3);

      const winScore    = scoreCategory(cat);
      const productName = extractTopKeyword(cat.headlines || [], cat._id);
      const sampleUrl   = (cat.sampleDirectUrls || []).find(Boolean) || null;
      const catSeason   = dominantSeason(cat.seasons || []);

      const topAdvertisers = topAdvs.map((a) => ({
        name:        a._id || 'Unknown',
        adCount:     a.adCount,
        maxDays:     Math.round(a.maxDays || 0),
        isHighSpend: a.spendSum > 0,
        sampleUrl:   a.directUrl || null,
        topKeyword:  extractTopKeyword(a.headlines || [], cat._id),
      }));

      return {
        id:              cat._id,
        category:        cat._id,
        name:            productName,
        winScore,
        advertiserCount: cat.advCount,
        totalAds:        cat.totalAds,
        maxDaysRunning:  Math.round(cat.maxDays || 0),
        avgDaysRunning:  Math.round(cat.avgDays || 0),
        highSpendAds:    cat.spendSum,
        platforms:       cat.platforms || ['facebook'],
        season:          catSeason,
        topAdvertisers,
        sampleUrl,
        source:          'facebook_ads',
        windowDays:      WINDOW_DAYS,
        isProvenWinner:  (cat.maxDays || 0) >= 30,
        cityFilter:      city   || null,
        seasonFilter:    season || null,
      };
    })
  );

  return results.sort((a, b) => b.winScore - a.winScore).slice(0, limit);
}

/**
 * Summary stats for the UI banner.
 */
export async function getAdStats(city = null, season = null) {
  await connectDB();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const match = { scrapedAt: { $gte: since }, isActive: true };
  if (city)                              match.city   = city;
  if (season && season !== 'general' && VALID_SEASONS.has(season)) match.season = season;

  const [row] = await ScrapedAd.aggregate([
    { $match: match },
    {
      $group: {
        _id:         null,
        totalAds:    { $sum: 1 },
        uniqueAdvs:  { $addToSet: '$advertiserName' },
        categories:  { $addToSet: '$category' },
        maxDays:     { $max: '$daysRunning' },
        lastScraped: { $max: '$scrapedAt' },
      },
    },
  ]);

  if (!row) return { totalAds: 0, uniqueAdvertisers: 0, categories: 0, maxDaysRunning: 0, lastScraped: null };
  return {
    totalAds:          row.totalAds,
    uniqueAdvertisers: row.uniqueAdvs.length,
    categories:        row.categories.filter(Boolean).length,
    maxDaysRunning:    row.maxDays,
    lastScraped:       row.lastScraped,
  };
}
