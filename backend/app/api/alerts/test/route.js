import { connectDB } from '@/lib/db';
import { Product } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { checkAndTriggerAlerts } from '@/services/alertService';

export const POST = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return Response.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return Response.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const result = await checkAndTriggerAlerts(product);

    return Response.json({
      success: true,
      data: {
        triggered: result.triggered,
        whatsappSent: result.whatsapp,
        emailSent: result.email,
        errors: result.errors,
        product: { name: product.name, winScore: product.winScore, slug: product.slug },
      },
    });
  } catch (err) {
    console.error('[POST /api/alerts/test]', err);
    return Response.json({ success: false, error: 'Failed to test alert' }, { status: 500 });
  }
});
