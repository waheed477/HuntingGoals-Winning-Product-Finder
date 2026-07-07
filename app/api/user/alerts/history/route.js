import { connectDB } from '@/lib/db';
import AlertLog from '@/models/AlertLog.js';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip  = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      AlertLog.find({ userId: user._id })
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('productName winScore channel sentAt delivered errorMessage -_id')
        .lean(),
      AlertLog.countDocuments({ userId: user._id }),
    ]);

    return Response.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/user/alerts/history]', err);
    return Response.json({ success: false, error: 'Failed to fetch alert history' }, { status: 500 });
  }
});
