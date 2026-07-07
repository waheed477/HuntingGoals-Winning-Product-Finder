import { connectDB } from '@/lib/db';
import { ScrapedAd } from '@/models/index';

const WINDOW_DAYS = 7;

export async function GET() {
  try {
    await connectDB();

    const sevenDaysAgo = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const today        = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow     = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAds,
      topWinnersRaw,
      trendingCategories,
      cityDemand,
      recentAdsToday,
    ] = await Promise.all([

      ScrapedAd.countDocuments({ scrapedAt: { $gte: sevenDaysAgo } }),

      // Winners: top advertisers by ad count in window, with real ad details
      ScrapedAd.aggregate([
        {
          $match: {
            scrapedAt:  { $gte: sevenDaysAgo },
            isActive:   true,
            advertiserName: { $ne: null, $exists: true },
            headline:   { $ne: null, $exists: true },
          },
        },
        {
          $group: {
            _id:            '$advertiserName',
            headline:       { $first: '$headline' },
            daysRunning:    { $max:   '$daysRunning' },
            spendLevel:     { $first: '$spendLevel' },
            platform:       { $first: '$platform' },
            category:       { $first: '$category' },
            directUrl:      { $first: '$directUrl' },
            totalAds:       { $sum:   1 },
            advertisers:    { $addToSet: '$advertiserName' },
          },
        },
        {
          $addFields: {
            winScore: {
              $min: [
                100,
                {
                  $add: [
                    { $multiply: [{ $size: '$advertisers' }, 4] },
                    { $min: [30, { $divide: ['$totalAds', 2] }] },
                    { $cond: [{ $gte: ['$daysRunning', 30] }, 20, { $cond: [{ $gte: ['$daysRunning', 14] }, 10, 5] }] },
                    { $cond: [{ $eq: ['$spendLevel', 'High'] }, 10, { $cond: [{ $eq: ['$spendLevel', 'Medium'] }, 5, 0] }] },
                  ],
                },
              ],
            },
          },
        },
        { $sort: { daysRunning: -1, totalAds: -1, winScore: -1 } },
        { $limit: 10 },
      ]),

      ScrapedAd.aggregate([
        { $match: { scrapedAt: { $gte: sevenDaysAgo }, category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 }, advertisers: { $addToSet: '$advertiserName' } } },
        { $addFields: { advCount: { $size: '$advertisers' } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),

      ScrapedAd.aggregate([
        { $match: { scrapedAt: { $gte: sevenDaysAgo }, city: { $ne: null, $exists: true } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),

      ScrapedAd.countDocuments({ scrapedAt: { $gte: today, $lt: tomorrow } }),
    ]);

    let hotAlertsToday = 0;
    try {
      const { AlertLog } = await import('@/models/index');
      hotAlertsToday = await AlertLog.countDocuments({
        sentAt: { $gte: today, $lt: tomorrow },
      });
    } catch {
      // AlertLog model not available
    }

    return Response.json({
      success: true,
      data: {
        totalProducts:  topWinnersRaw.length,
        totalAds,
        hotAlertsToday,
        recentAdsToday,
        topWinners: topWinnersRaw.map((w) => {
          // Normalise spend level to Title Case for frontend badge styles
          const rawSpend  = (w.spendLevel || '').toLowerCase();
          const spendLevel = rawSpend === 'high' ? 'High' : rawSpend === 'medium' ? 'Medium' : 'Low';
          return {
            id:             w._id,
            name:           (w.headline || '').slice(0, 70).trim() || w._id,
            advertiserName: w._id,
            daysRunning:    Math.round(w.daysRunning || 0),
            spendLevel,
            platform:       w.platform    || 'facebook',
            category:       w.category    || 'General',
            directUrl:      w.directUrl   || null,
            totalAds:       w.totalAds    || 1,
            winScore:       Math.round(w.winScore || 0),
          };
        }),
        trendingCategories: trendingCategories.map((c) => ({
          name:        c._id || 'Uncategorized',
          count:       c.count,
          advertisers: c.advCount,
        })),
        cityDemand: cityDemand.map((c) => ({
          city:  c._id || 'Unknown',
          count: c.count,
        })),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[GET /api/dashboard/stats]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
