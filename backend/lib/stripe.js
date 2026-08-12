import Stripe from 'stripe';

// Plan catalogue — single source of truth for billing.
// Prices in USD cents, billed monthly via Stripe Checkout (subscription mode).
export const BILLING_PLANS = {
  pro: {
    key:    'pro',
    name:   'TrendSpy Pro',
    amount: 1900,   // $19.00 / month (matches UpgradePlanModal)
  },
  business: {
    key:    'business',
    name:   'TrendSpy Business',
    amount: 4900,   // $49.00 / month
  },
};

let stripeClient = null;

/**
 * Lazy Stripe init so the server boots fine without keys (503 from routes
 * instead of a crash — same pattern as Google OAuth routes).
 * @returns {Stripe|null} null when STRIPE_SECRET_KEY is not configured
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key); // SDK-pinned API version
  }
  return stripeClient;
}
