import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import EmailVerification from '@/models/EmailVerification.js';
import { isValidEmail } from '@/lib/validators';
import { sendMail } from '@/services/mailTransport.js';
import { isEmailConfigured } from '@/services/mailTransport.js';

// Combined-service friendly: works with FRONTEND_URL, falls back to Render's
// own injected URL so links are always absolute and correct.
const APP_URL = (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').replace(/\/+$/, '');

function magicEmailHtml(link) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f23;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0" style="background:#1a1a3e;border-radius:16px;border:1px solid rgba(99,102,241,0.3);max-width:500px;">
        <tr><td style="padding:32px;">
          <h2 style="color:#818cf8;margin:0 0 14px;">Your instant sign-in link</h2>
          <p style="color:#e5e7eb;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Tap the button below to sign in to <strong>TrendSpy — Hunting Goals</strong>.
            No password, no code — one tap and you're in.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;">
              Sign in now →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
            This link works once and expires in <strong>15 minutes</strong>.<br>
            If you didn't request it, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;">TrendSpy — Find winning products before your competitors</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  try {
    const { email } = await request.json().catch(() => ({}));
    if (!email || !isValidEmail(email)) {
      return Response.json({ success: false, error: 'A valid email is required' }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      return Response.json({
        success: false,
        error: 'Email sign-in is not configured on the server yet — please use email + password below.',
      }, { status: 503 });
    }

    await connectDB();
    const normalized = email.toLowerCase();

    const token = crypto.randomBytes(32).toString('hex');
    await EmailVerification.findOneAndUpdate(
      { email: normalized, purpose: 'magic-link' },
      { otp: token, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      { upsert: true, new: true }
    );

    const link = `${APP_URL}/api/auth/magic-link/verify?token=${token}`;
    await sendMail({ to: normalized, subject: 'Your TrendSpy sign-in link (valid 15 min)', html: magicEmailHtml(link) });

    return Response.json({ success: true, message: 'Magic link sent' });
  } catch (err) {
    console.error('[POST /api/auth/magic-link]', err.message);
    return Response.json({ success: false, error: 'Could not send the link — please try again shortly.' }, { status: 500 });
  }
}
