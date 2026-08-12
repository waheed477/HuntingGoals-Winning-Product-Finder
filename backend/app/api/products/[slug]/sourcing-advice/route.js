import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { generateSourcingAdvice } from '@/services/sourcingAdviceAgent';

// POST /api/products/[slug]/sourcing-advice — on-demand, cached Groq advice.
export const POST = withAuth(async (request, { params }, user) => {
  try {
    await connectDB();
    const { slug } = params;

    const product = await Product.findOne({ slug })
      .populate('matchedSuppliers', 'name city rating verificationStatus category');
    if (!product) {
      return Response.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    // ── Cache hit: advice already generated → return instantly ──────────────
    if (product.sourcingAdvice?.generatedAt && product.sourcingAdvice?.summary) {
      return Response.json({ success: true, cached: true, sourcingAdvice: product.sourcingAdvice });
    }

    const advice = await generateSourcingAdvice(product);
    if (!advice) {
      return Response.json(
        { success: false, error: 'AI service is not configured on this server (missing GROQ_API_KEY).' },
        { status: 503 }
      );
    }

    product.sourcingAdvice = { ...advice, generatedAt: new Date() };
    await product.save();

    return Response.json({ success: true, cached: false, sourcingAdvice: product.sourcingAdvice });
  } catch (err) {
    console.error('[POST /api/products/[slug]/sourcing-advice]', err.message);
    return Response.json({ success: false, error: 'Could not generate advice — please try again shortly.' }, { status: 500 });
  }
});
