import { connectDB } from '@/lib/db';
import { ScrapedAd, Product, Supplier } from '@/models/index';

export async function GET() {
  try {
    const [schedulerData, stats] = await Promise.allSettled([
      (async () => {
        const scheduler = globalThis.__trendspyScheduler;
        if (!scheduler) return { scheduler: { enabled: false, startedAt: null }, nextRuns: {} };
        return { scheduler: scheduler.getStatus(), nextRuns: scheduler.getNextRuns() };
      })(),
      (async () => {
        await connectDB();
        const [totalAds, totalProducts, totalSuppliers] = await Promise.all([
          ScrapedAd.countDocuments(),
          Product.countDocuments(),
          Supplier.countDocuments(),
        ]);
        return { totalAds, totalProducts, totalSuppliers };
      })(),
    ]);

    return Response.json({
      success:   true,
      scheduler: schedulerData.status === 'fulfilled' ? schedulerData.value.scheduler : {},
      nextRuns:  schedulerData.status === 'fulfilled' ? schedulerData.value.nextRuns  : {},
      stats:     stats.status === 'fulfilled'
        ? stats.value
        : { totalAds: 0, totalProducts: 0, totalSuppliers: 0 },
      environment: {
        autoScraperEnabled: process.env.AUTO_SCRAPER_ENABLED !== 'false',
      },
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 502 });
  }
}
