import { connectDB } from '@/lib/db';
import { Alert } from '@/models/index';
import { withAuth } from '@/middleware/auth';

const VALID_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];
const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books'];
const VALID_CHANNELS = ['email', 'whatsapp', 'both'];

const RATE_LIMIT_MAP = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(userId) {
  const now = Date.now();
  const key = userId.toString();
  const entry = RATE_LIMIT_MAP.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    RATE_LIMIT_MAP.set(key, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();
    const alerts = await Alert.findByUser(user._id);
    return Response.json({ success: true, data: { alerts } });
  } catch (err) {
    console.error('[GET /api/alerts]', err);
    return Response.json({ success: false, error: 'Failed to fetch alerts' }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const body = await request.json();
    const { city, category, minWinScore, channel } = body;

    if (city && !VALID_CITIES.includes(city)) {
      return Response.json({ success: false, error: `Invalid city. Must be one of: ${VALID_CITIES.join(', ')}` }, { status: 400 });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return Response.json({ success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    if (minWinScore !== undefined && (minWinScore < 0 || minWinScore > 100)) {
      return Response.json({ success: false, error: 'minWinScore must be between 0 and 100' }, { status: 400 });
    }

    if (channel && !VALID_CHANNELS.includes(channel)) {
      return Response.json({ success: false, error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` }, { status: 400 });
    }

    if ((channel === 'whatsapp' || channel === 'both') && !user.phoneNumber) {
      return Response.json(
        { success: false, error: 'A phone number is required for WhatsApp alerts. Update your profile first.' },
        { status: 400 }
      );
    }

    if (isRateLimited(user._id)) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded: maximum 5 alerts per hour.' },
        { status: 429 }
      );
    }

    const alert = await Alert.create({
      userId: user._id,
      city: city || null,
      category: category || null,
      minWinScore: minWinScore ?? 75,
      channel: channel || 'email',
    });

    return Response.json({ success: true, data: { alert } }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/alerts]', err);
    return Response.json({ success: false, error: 'Failed to create alert' }, { status: 500 });
  }
});
