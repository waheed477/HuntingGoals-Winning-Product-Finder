import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';

// GET /api/billing/status — current plan info for the profile badge / UI.
export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();
    const profile = await User.findById(user._id)
      .select('subscriptionPlan planActivatedAt stripeCustomerId stripeSubscriptionId')
      .lean();
    if (!profile) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        plan:                 profile.subscriptionPlan || 'free',
        planActivatedAt:      profile.planActivatedAt || null,
        hasStripeCustomer:    Boolean(profile.stripeCustomerId),
        subscriptionActive:   Boolean(profile.stripeSubscriptionId),
      },
    });
  } catch (err) {
    console.error('[GET /api/billing/status]', err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
