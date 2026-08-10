import { connectDB } from '@/lib/db';
import { ScrapedAd } from '@/models/index';

/**
 * Run the live FB Ad Library scrape in-process. The scraper (lib/fbLiveScraper.js)
 * is registered on globalThis by the main server at boot — importing it here
 * would pull Puppeteer into the webpack bundle, which must never happen.
 * Launch failures degrade to the JSON-API fallback inside the scraper itself.
 */
async function runLiveScrape(searchTerm, category) {
  const scrape = globalThis.__trendspyScrapeFbAds;
  if (!scrape) {
    const err = new Error('Live scraper not initialized yet — server still starting');
    err.statusCode = 503;
    throw err;
  }
  const ads = await scrape(searchTerm, category);
  return { ads, totalFound: ads.length };
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const { searchTerm = 'smart watch Pakistan', category = 'Electronics', platform = 'all' } = body;

    console.log(`[POST /api/ads/refresh] Scraping: "${searchTerm}" category="${category}" platform="${platform}"`);

    const result = await runLiveScrape(searchTerm, category, platform);
    const ads    = result.ads || [];

    // Upsert ads into MongoDB
    let savedNew = 0;
    for (const ad of ads) {
      if (!ad.adId) continue;
      try {
        const existing = await ScrapedAd.findOneAndUpdate(
          { adId: ad.adId },
          {
            $set: {
              advertiserName: ad.advertiserName,
              headline:       ad.headline,
              description:    ad.description || '',
              daysRunning:    ad.daysRunning || 0,
              creativeType:   ad.creativeType || 'image',
              spendLevel:     ad.spendLevel   || 'low',
              imageUrl:       ad.imageUrl     || '',
              videoUrl:       ad.videoUrl     || '',
              platform:       ad.platform     || 'facebook',
              category:       ad.category     || category,
              directUrl:      ad.directUrl    || '',
              isActive:       true,
              scrapedAt:      new Date(),
            },
            $setOnInsert: { firstSeenAt: new Date() },
          },
          { upsert: true, new: false }
        );
        if (!existing) savedNew++;
      } catch (err) {
        console.warn(`[ads/refresh] Failed to save ad ${ad.adId}: ${err.message}`);
      }
    }

    return Response.json({
      success:    true,
      totalFound: result.totalFound,
      savedNew,
      ads:        ads.slice(0, 10).map((ad) => ({
        adId:           ad.adId,
        advertiserName: ad.advertiserName,
        headline:       ad.headline,
        daysRunning:    ad.daysRunning,
        spendLevel:     ad.spendLevel,
        creativeType:   ad.creativeType,
        directUrl:      ad.directUrl,
        platform:       ad.platform,
        category:       ad.category,
      })),
    });
  } catch (err) {
    console.error('[POST /api/ads/refresh]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/ads/refresh — purge stale/bad ads
export async function DELETE() {
  try {
    await connectDB();
    const BAD_HEADLINES = ['Active', 'keyword search.', '', null];
    const result = await ScrapedAd.deleteMany({
      $or: [
        { advertiserName: { $in: ['Unknown', '', null] } },
        { headline: { $in: BAD_HEADLINES } },
        { headline: { $regex: /^keyword search/i } },
        { headline: { $regex: /^Active$/i } },
        { headline: { $exists: false } },
      ],
    });
    return Response.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
