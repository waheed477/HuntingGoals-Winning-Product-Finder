import { connectDB }       from '@/lib/db';
import { getProductHistory, getTrendPrediction } from '@/services/historyService';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const { slug } = await params;

    if (!slug) {
      return Response.json({ success: false, error: 'slug is required' }, { status: 400 });
    }

    const [history, prediction] = await Promise.all([
      getProductHistory(slug, days),
      getTrendPrediction(slug),
    ]);

    return Response.json({ success: true, data: { history, prediction, days } });
  } catch (err) {
    console.error('[history route]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
