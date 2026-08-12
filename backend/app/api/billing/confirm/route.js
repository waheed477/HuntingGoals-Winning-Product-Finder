import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { getStripe, BILLING_PLANS } from '@/lib/stripe';

// GET /api/billing/confirm?session_id=cs_test_...
// Called by the success landing page right after Stripe redirects back.
// Verifies the session belongs to THIS user and activates the plan.
// (The webhook is the authoritative path; this is the fast UX path so the
// user sees their badge immediately without waiting/requiring Stripe CLI.)
export const GET = withAuth(async (request, context, user) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return Response.json(
        { success: false, error: 'Payments are not configured on this server yet.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || '';
    if (!sessionId.startsWith('cs_')) {
      return Response.json({ success: false, error: 'Invalid session id.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== String(user._id)) {
      return Response.json({ success: false, error: 'This payment session does not belong to your account.' }, { status: 403 });
    }

    const planKey = BILLING_PLANS[session.metadata?.plan] ? session.metadata.plan : null;
    const paid    = session.status === 'complete' &&
      (session.payment_status === 'paid' || session.mode === 'subscription');

    if (!planKey || !paid) {
      return Response.json({ success: false, error: 'Payment is not completed yet.' }, { status: 400 });
    }

    await connectDB();
    const updated = await User.findByIdAndUpdate(
      user._id,
      {
        subscriptionPlan:      planKey,
        stripeCustomerId:      typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
        stripeSubscriptionId:  typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
        planActivatedAt:       new Date(),
      },
      { new: true }
    ).select('subscriptionPlan');
    if (!updated) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return Response.json({ success: true, data: { plan: updated.subscriptionPlan } });
  } catch (err) {
    console.error('[GET /api/billing/confirm]', err.message);
    return Response.json({ success: false, error: 'Could not verify the payment — please refresh in a moment.' }, { status: 502 });
  }
});
