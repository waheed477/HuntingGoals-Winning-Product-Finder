import { connectDB } from '@/lib/db';
import { Product, Alert } from '@/models/index';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalProducts,
      winningProducts,
      activeAlerts,
      alertsSentToday,
      categoryAgg,
      cityAgg,
      lastScraped,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ winScore: { $gte: 75 } }),
      Alert.countDocuments({ isActive: true }),
      Alert.countDocuments({ lastTriggeredAt: { $gte: startOfDay } }),

      // Top trending categories by average winScore
      Product.aggregate([
        { $group: { _id: '$category', avgScore: { $avg: '$winScore' }, count: { $sum: 1 } } },
        { $sort: { avgScore: -1 } },
        { $limit: 5 },
      ]),

      // Top cities by product count
      Product.aggregate([
        { $unwind: '$cities' },
        { $group: { _id: '$cities', count: { $sum: 1 }, avgScore: { $avg: '$winScore' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Most recent scrape timestamps per platform
      Product.aggregate([
        { $match: { lastScrapedAt: { $ne: null } } },
        { $unwind: '$platforms' },
        { $group: { _id: '$platforms', lastRun: { $max: '$lastScrapedAt' } } },
      ]),
    ]);

    const scraperMap = {};
    for (const s of lastScraped) scraperMap[s._id] = s.lastRun;

    return Response.json({
      success: true,
      data: {
        totalProducts,
        winningProducts,
        activeAlerts,
        alertsSentToday,
        scrapers: {
          lastDarazRun:  scraperMap.daraz   || null,
          lastOLXRun:    scraperMap.olx     || null,
          lastTikTokRun: scraperMap.tiktok  || null,
          lastFbAdsRun:  scraperMap.facebook || null,
        },
        trendingCategories: categoryAgg.map((c) => ({
          category: c._id,
          avgWinScore: Math.round(c.avgScore),
          productCount: c.count,
        })),
        topCities: cityAgg.map((c) => ({
          city: c._id,
          productCount: c.count,
          avgWinScore: Math.round(c.avgScore),
        })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[GET /api/stats]', err);
    return Response.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
});
