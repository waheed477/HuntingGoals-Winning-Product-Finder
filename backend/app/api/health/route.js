import { connectDB } from '@/lib/db';
import { User, Product, Alert, TrendScore, ScrapedAd, SeasonalEvent } from '@/models/index';

export async function GET() {
  try {
    await connectDB();

    // Verify all models are registered and queryable
    const modelChecks = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Alert.countDocuments(),
      TrendScore.countDocuments(),
      ScrapedAd.countDocuments(),
      SeasonalEvent.countDocuments(),
    ]);

    const [users, products, alerts, trendScores, scrapedAds, seasonalEvents] = modelChecks;

    return Response.json({
      status: 'ok',
      message: 'MongoDB connected successfully',
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME || 'trendspy',
      models: { users, products, alerts, trendScores, scrapedAds, seasonalEvents },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return Response.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
