import { connectDB }                                                                    from '@/lib/db';
import { getAdBasedWinners, getAdStats, getCityCoverage, backfillCities, backfillSeasons, getSeasonCoverage, cleanFakeAds } from '@/services/adWinningService';
import { ensureAdsExist }                                                                from '@/services/scraperService';

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

    const payload = {
      products:       products.slice(0, limit),
      total:          products.length,
      stats,
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
