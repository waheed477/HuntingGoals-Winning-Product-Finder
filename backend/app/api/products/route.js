import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';
import { isValidCity, isValidCategory } from '@/lib/validators';
import { calculateConfidenceScore, confidenceLabel } from '@/services/productVerificationService';
import { getSeasonalScore } from '@/services/seasonalFilterService';

const SORT_OPTIONS = {
  winScore: { winScore: -1 },
  trending: { trend: 1, winScore: -1 }, // 'rising' sorts before others alphabetically
  newest: { createdAt: -1 },
  mostAds: { activeAds: -1 },
};

const PROJECTION = {
  name: 1,
  slug: 1,
  imageUrl: 1,
  winScore: 1,
  priceMin: 1,
  priceMax: 1,
  trend: 1,
  platforms: 1,
  cities: 1,
  category: 1,
  isWinning: 1,
  darazOrders: 1,
  darazRating: 1,
  activeAds: 1,
  tiktokViews: 1,
  olxViews: 1,
  olxListings: 1,
  googleTrendSpike: 1,
  alibabaOrderSurge: 1,
  competitorCount: 1,
  topCompetitors: 1,
  isVerified: 1,
  imageMismatchFlag: 1,
  seasonalWarning: 1,
  createdAt: 1,
};

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const minScore = parseInt(searchParams.get('minScore') || '0', 10);
    const sortBy = searchParams.get('sortBy') || 'winScore';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Build filter
    const filter = {};
    if (city && isValidCity(city)) filter.cities = city;
    if (category && isValidCategory(category)) filter.category = category;
    if (minScore > 0) filter.winScore = { $gte: minScore };

    const sort = SORT_OPTIONS[sortBy] || SORT_OPTIONS.winScore;
    const skip = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      Product.find(filter, PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    // Feature 6: Enrich each product with confidence score + seasonal warning
    const products = rawProducts.map((p) => {
      const score = calculateConfidenceScore(p);
      const label = confidenceLabel(score);

      // Live seasonal warning (or persisted one from autoCorrect job)
      const { warning: liveWarning } = getSeasonalScore(p.category, p.name);
      const seasonalWarning = p.seasonalWarning || liveWarning || null;

      // Verification note from image mismatch flag
      const verificationNote = p.imageMismatchFlag
        ? 'Image may not match product — verify before sourcing'
        : null;

      return {
        ...p,
        confidence:      label,
        confidenceScore: score,
        isVerified:      p.isVerified ?? score >= (parseInt(process.env.CONFIDENCE_THRESHOLD, 10) || 60),
        verificationNote,
        seasonalWarning,
      };
    });

    return Response.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Products list error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
