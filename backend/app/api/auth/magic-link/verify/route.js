import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import EmailVerification from '@/models/EmailVerification.js';
import { generateToken } from '@/middleware/auth';

const APP_URL = (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').replace(/\/+$/, '');

// GET /api/auth/magic-link/verify?token=...
// One-shot token → user session → redirect to the SPA with the JWT hand-off
// (same pattern as the Google callback flow).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const fail = (code) => Response.redirect(`${APP_URL}/login?error=${code}`, 302);
  if (!token) return fail('magic_invalid');

  try {
    await connectDB();

    const record = await EmailVerification.findOne({ otp: token, purpose: 'magic-link' });
    if (!record) return fail('magic_invalid');

    if (record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: record._id });
      return fail('magic_expired');
    }
    await EmailVerification.deleteOne({ _id: record._id }); // one-shot — burn it

    const email = record.email;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name:          email.split('@')[0],
        email,
        emailVerified: true,
        authProvider:  'magic-link',
      });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const jwt  = generateToken(user._id, user.email);
    const name = encodeURIComponent(user.name || '');

    return Response.redirect(`${APP_URL}/login?magic=success&token=${jwt}&name=${name}`, 302);
  } catch (err) {
    console.error('[GET /api/auth/magic-link/verify]', err);
    return fail('magic_server');
  }
}
