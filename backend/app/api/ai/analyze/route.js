import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { analyzeProduct, generateAdGuide } from '@/services/groqService';

const RATE_LIMIT_MAP = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;

function isRateLimited(userId) {
  const key = userId.toString();
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    RATE_LIMIT_MAP.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_PER_HOUR) return true;
  entry.count++;
  return false;
}

export const POST = withAuth(async (request, context, user) => {
  try {
    if (isRateLimited(user._id)) {
      return Response.json(
        { success: false, error: 'Rate limit: max 10 AI analyses per hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { productName, productId } = body;

    if (!productName && !productId) {
      return Response.json(
        { success: false, error: 'productName or productId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    let product = null;
    let name = productName;

    if (productId) {
      product = await Product.findById(productId).lean();
      if (!product) {
        return Response.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      name = product.name;
    }

    const productData = product || {};
    const city        = productData.cities?.[0] || body.city || null;

    const [analysis, adGuideResult] = await Promise.all([
      analyzeProduct(name, productData),
      generateAdGuide(name, productData, city),
    ]);

    return Response.json({
      success: true,
      data: {
        productName: name,
        analysis:    { ...analysis, adGuide: adGuideResult.guide, adGuideSource: adGuideResult.source },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/ai/analyze]', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
