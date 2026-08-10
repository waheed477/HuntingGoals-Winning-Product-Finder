import { getSeasonalRecommendations } from '@/services/seasonalService';

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const data = await getSeasonalRecommendations(limit);

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('[GET /api/seasonal/recommendations]', err);
    return Response.json({ success: false, error: 'Failed to fetch seasonal recommendations' }, { status: 500 });
  }
};
