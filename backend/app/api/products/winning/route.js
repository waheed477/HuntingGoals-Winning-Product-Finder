import { connectDB }                                                                    from '@/lib/db';
import { getAdBasedWinners, getAdStats, getCityCoverage, backfillCities, backfillSeasons, getSeasonCoverage, cleanFakeAds } from '@/services/adWinningService';
import { ensureAdsExist }                                                                from '@/services/scraperService';
import { recordWinnerSnapshots, attachWinnerTrends }                                     from '@/services/winnerTrendService';
import { attachDarazEstimates }                                                          from '@/services/darazEstimateService';
import { ScrapedAd }                                                                     from '@/models/index';

const PAKISTAN_CITIES = [
  'Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad',
  'Multan','Peshawar','Quetta','Sialkot','Gujranwala',
];

const VALID_SEASONS = new Set(['winter', 'summer', 'ramadan', 'wedding', 'backToSchool', 'general']);

// City × season × limit keyed cache
const _cache    = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(city, season, limit) {
  return `${city || ''}:${season || ''}:${limit}`;
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const bust      = searchParams.get('bust') === '1';
    const limit     = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const rawCity   = (searchParams.get('city')   || '').trim();
    const rawSeason = (searchParams.get('season') || '').trim();

    const city   = PAKISTAN_CITIES.includes(rawCity)   ? rawCity   : null;
    const season = VALID_SEASONS.has(rawSeason)         ? rawSeason : null;

    const cacheKey = getCacheKey(city, season, limit);
    const cached   = _cache.get(cacheKey);

    if (!bust && cached && Date.now() - cached.at < CACHE_TTL) {
      return Response.json({ success: true, cached: true, data: cached.payload });
    }

    // Non-blocking background tasks (fire-and-forget)
    ensureAdsExist();
    cleanFakeAds().catch((e)    => console.warn('[cleanFakeAds]',    e.message));
    backfillCities().catch((e)  => console.warn('[backfillCities]',  e.message));
    backfillSeasons().catch((e) => console.warn('[backfillSeasons]', e.message));

    const [products, stats, cityCoverage, seasonCoverage] = await Promise.all([
      getAdBasedWinners(50, city, season),
      getAdStats(city, season),
      getCityCoverage(),
      getSeasonCoverage(),
    ]);

    // Score history: record today's point (idempotent), then attach the
    // 14-day sparkline + Rising/Cooling direction to every winner.
    await recordWinnerSnapshots(products);
    await attachWinnerTrends(products);
    // Daraz demand/price signals (read-only here — refreshed by the throttled cron)
    await attachDarazEstimates(products);

    // Always surface the freshest raw ads too — the winner view needs multiple
    // advertisers/terms before categories form, so this keeps the tab alive on
    // day one (and shows exactly what the last scrape pulled).
    const recentAds = await ScrapedAd.find({
      isActive: true,
      headline: { $ne: null, $exists: true },
    })
      .sort({ scrapedAt: -1, _id: -1 })
      .limit(24)
      .select('adId advertiserName headline description imageUrl videoUrl daysRunning spendLevel creativeType platform category city directUrl scrapedAt')
      .lean();

    const payload = {
      products:       products.slice(0, limit),
      total:          products.length,
      stats,
      recentAds,
      cityCoverage,
      seasonCoverage,
      cityFilter:     city   || null,
      seasonFilter:   season || null,
      source:         'facebook_ads_live',
      windowDays:     7,
      lastUpdated:    new Date().toISOString(),
    };

    _cache.set(cacheKey, { payload, at: Date.now() });

    return Response.json({ success: true, cached: false, data: payload });
  } catch (err) {
    console.error('[GET /api/products/winning]', err.message);
    return Response.json({
      success: true,
      cached:  false,
      error:   err.message,
      data:    {
        products:       [],
        total:          0,
        stats:          { totalAds: 0, uniqueAdvertisers: 0, categories: 0, maxDaysRunning: 0, lastScraped: null },
        recentAds:      [],
        cityCoverage:   {},
        seasonCoverage: {},
        cityFilter:     null,
        seasonFilter:   null,
        source:         'fallback',
        windowDays:     7,
        lastUpdated:    new Date().toISOString(),
      },
    });
  }
}
