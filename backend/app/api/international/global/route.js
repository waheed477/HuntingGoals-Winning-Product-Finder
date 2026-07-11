import { connectDB } from '@/lib/db';
import ShopifyProduct from '@/models/ShopifyProduct';
import GoogleShoppingProduct from '@/models/GoogleShoppingProduct';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sortBy   = searchParams.get('sortBy') || 'popularity';
    const page     = Math.max(1,   parseInt(searchParams.get('page')  || '1',  10));
    const limit    = Math.min(100, parseInt(searchParams.get('limit') || '30', 10));
    const skip     = (page - 1) * limit;

    const filter = {};
    if (category && category !== 'All') filter.category = category;

    const sortMap = {
      price:      { priceUSD: 1 },
      popularity: { reviewCount: -1 },
      rating:     { rating: -1 },
      newest:     { lastSeenAt: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.popularity;

    const [shopifyDocs, googleDocs, shopifyTotal, googleTotal] = await Promise.all([
      ShopifyProduct.find(filter).sort(sort).skip(skip).limit(Math.ceil(limit / 2)).lean(),
      GoogleShoppingProduct.find(filter).sort(sort).skip(skip).limit(Math.floor(limit / 2)).lean(),
      ShopifyProduct.countDocuments(filter),
      GoogleShoppingProduct.countDocuments(filter),
    ]);

    const shopify = shopifyDocs.map((p) => ({
      id:           p._id,
      source:       'shopify',
      name:         p.productTitle,
      priceUSD:     p.priceUSD,
      pricePKR:     p.pricePKR,
      imageUrl:     p.imageUrl,
      storeName:    p.storeName,
      storeUrl:     p.storeUrl,
      productUrl:   p.productUrl,
      rating:       p.rating,
      reviewCount:  p.reviewCount,
      category:     p.category,
      lastSeenAt:   p.lastSeenAt,
    }));

    const google = googleDocs.map((p) => ({
      id:              p._id,
      source:          'google',
      name:            p.productName,
      priceUSD:        p.priceUSD,
      pricePKR:        p.pricePKR,
      imageUrl:        p.imageUrl,
      storeName:       p.storeName,
      storeUrl:        p.storeUrl,
      productUrl:      p.productUrl,
      rating:          p.rating,
      reviewCount:     p.reviewCount,
      shipsToPakistan: p.shipsToPakistan,
      category:        p.category,
      lastSeenAt:      p.lastSeenAt,
    }));

    const total = shopifyTotal + googleTotal;

    return Response.json({
      success: true,
      data: {
        products: [...shopify, ...google],
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        sources: { shopify: shopifyTotal, google: googleTotal },
      },
    });
  } catch (err) {
    console.error('[GET /api/international/global]', err);
    return Response.json({ success: false, error: 'Failed to fetch global products' }, { status: 500 });
  }
}
