import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { getStripe, BILLING_PLANS } from '@/lib/stripe';

// POST /api/billing/webhook — Stripe → server event sink (authoritative).
// Raw body + signature verification are mandatory; never trust the payload.
//
// Local dev:   stripe listen --forward-to localhost:3001/api/billing/webhook
// Production:  Dashboard → Developers → Webhooks → add this URL (onRender URL).
//
// Handled events:
//   checkout.session.completed      → activate plan
//   customer.subscription.deleted   → downgrade to free
export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return Response.json(
      { success: false, error: 'Stripe webhook is not configured on this server.' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody   = await request.text(); // raw string required for verification

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err.message);
    return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await connectDB();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      if (userId && BILLING_PLANS[plan]) {
        await User.findByIdAndUpdate(userId, {
          subscriptionPlan:     plan,
          stripeCustomerId:     typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null,
          planActivatedAt:      new Date(),
        });
        console.log(`[Stripe webhook] Plan activated: user=${userId} plan=${plan}`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const result = await User.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { subscriptionPlan: 'free', stripeSubscriptionId: null }
      );
      if (result) {
        console.log(`[Stripe webhook] Subscription cancelled → downgraded user ${result._id}`);
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] Handler error:', err.message);
    return Response.json({ success: false, error: 'Webhook handler failed' }, { status: 500 });
  }
}
