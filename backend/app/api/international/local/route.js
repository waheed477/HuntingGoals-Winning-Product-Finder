import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const city     = searchParams.get('city');
    const category = searchParams.get('category');
    const minScore = parseInt(searchParams.get('minScore') || '0', 10);
    const sortBy   = searchParams.get('sortBy') || 'winScore';
    const page     = Math.max(1,   parseInt(searchParams.get('page')  || '1',  10));
    const limit    = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const skip     = (page - 1) * limit;

    const filter = { isActive: true };
    if (city     && city     !== 'All') filter.cities    = city;
    if (category && category !== 'All') filter.category  = category;
    if (minScore > 0)                   filter.winScore   = { $gte: minScore };

    const sortMap = {
      winScore:    { winScore: -1 },
      daraz:       { darazOrders: -1 },
      tiktok:      { tiktokViews: -1 },
      price:       { priceMin: 1 },
      newest:      { createdAt: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.winScore;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit)
        .select('name category cities priceMin priceMax winScore darazOrders tiktokViews olxViews activeAds googleTrendSpike imageUrl platform')
        .lean(),
      Product.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      data: {
        products,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /api/international/local]', err);
    return Response.json({ success: false, error: 'Failed to fetch local products' }, { status: 500 });
  }
}
