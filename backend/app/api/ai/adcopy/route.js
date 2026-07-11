import { withAuth } from '@/middleware/auth';
import { generateAdCopy } from '@/services/groqService';

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const { productName, category, targetAudience } = body;

    if (!productName || !category) {
      return Response.json(
        { success: false, error: 'productName and category are required' },
        { status: 400 }
      );
    }

    const adCopy = await generateAdCopy(productName, category, targetAudience);

    return Response.json({
      success: true,
      data: {
        productName,
        category,
        ...adCopy,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /api/ai/adcopy]', err);
    const status = err.message?.includes('GROQ_API_KEY') ? 503 : 500;
    return Response.json({ success: false, error: err.message }, { status });
  }
});
