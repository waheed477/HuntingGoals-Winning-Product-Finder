import axios from 'axios';
import { connectDB } from '@/lib/db';
import { ScrapedAd, Product, Supplier } from '@/models/index';

const SOCKET_BASE = process.env.SOCKET_INTERNAL_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const [schedulerRes, dbCounts] = await Promise.allSettled([
      axios.get(`${SOCKET_BASE}/scheduler/status`, { timeout: 5000 }),
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

    const schedulerData =
      schedulerRes.status === 'fulfilled'
        ? schedulerRes.value.data
        : { scheduler: { enabled: false, startedAt: null }, nextRuns: {} };

    const stats =
      dbCounts.status === 'fulfilled'
        ? dbCounts.value
        : { totalAds: 0, totalProducts: 0, totalSuppliers: 0 };

    return Response.json({
      success: true,
      scheduler: schedulerData.scheduler || {},
      nextRuns:  schedulerData.nextRuns  || {},
      stats,
      environment: {
        autoScraperEnabled: process.env.AUTO_SCRAPER_ENABLED === 'true',
      },
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 502 });
  }
}
