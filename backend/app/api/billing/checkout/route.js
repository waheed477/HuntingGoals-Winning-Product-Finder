import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { getStripe, BILLING_PLANS } from '@/lib/stripe';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

// POST /api/billing/checkout  { plan: 'pro' | 'business' }
// Creates a Stripe Checkout Session (subscription mode) and returns its URL.
// The frontend just redirects the browser to that URL — no Stripe.js needed.
export const POST = withAuth(async (request, context, user) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return Response.json(
        { success: false, error: 'Payments are not configured on this server yet.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const plan = BILLING_PLANS[body.plan];
    if (!plan) {
      return Response.json(
        { success: false, error: `Unknown plan. Valid options: ${Object.keys(BILLING_PLANS).join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();
    const dbUser = await User.findById(user._id).select('email stripeCustomerId subscriptionPlan');
    if (!dbUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (dbUser.subscriptionPlan === plan.key) {
      return Response.json({ success: false, error: `You are already on the ${plan.name} plan.` }, { status: 409 });
    }

    const session = await stripe.checkout.sessions.create({
      mode:    'subscription',
      ...(dbUser.stripeCustomerId
        ? { customer: dbUser.stripeCustomerId }
        : { customer_email: dbUser.email }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'usd',
          unit_amount:  plan.amount,
          recurring:    { interval: 'month' },
          product_data: {
            name:        plan.name,
            description: 'Unlocks the full TrendSpy experience (test-mode billing).',
          },
        },
      }],
      metadata:    { userId: String(user._id), plan: plan.key },
      success_url: `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${FRONTEND_URL}/profile`,
    });

    return Response.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error('[POST /api/billing/checkout]', err.message);
    return Response.json({ success: false, error: 'Could not start checkout — please try again.' }, { status: 502 });
  }
});
