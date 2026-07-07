import { connectDB } from '@/lib/db';
import { SeasonalEvent } from '@/models/index';
import { getUpcomingSeasonEvents, getCurrentSeason } from '@/services/seasonalService';

export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20);

    // Try to get DB-backed events first
    const dbEvents = await SeasonalEvent.find({ isActive: true })
      .sort({ startDate: 1 })
      .lean();

    const upcomingEvents = await getUpcomingSeasonEvents(limit);
    const currentSeasons = getCurrentSeason();

    return Response.json({
      success: true,
      data: {
        currentSeasons,
        upcomingEvents,
        allEvents: dbEvents.map((e) => ({
          ...e,
          categoryBoost: e.categoryBoost ? Object.fromEntries(e.categoryBoost) : {},
        })),
      },
    });
  } catch (err) {
    console.error('[GET /api/seasonal/events]', err);
    return Response.json({ success: false, error: 'Failed to fetch seasonal events' }, { status: 500 });
  }
};
