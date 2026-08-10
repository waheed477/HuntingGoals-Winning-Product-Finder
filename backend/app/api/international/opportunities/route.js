import { connectDB } from '@/lib/db';
import { getOpportunities } from '@/services/opportunityService';

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit    = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));

    const opportunities = await getOpportunities(limit, category);

    return Response.json({
      success: true,
      data: {
        opportunities,
        total: opportunities.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/international/opportunities]', err);
    return Response.json({ success: false, error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
