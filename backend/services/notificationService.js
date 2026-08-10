import { connectDB }       from '../lib/db.js';
import InAppNotification   from '../models/InAppNotification.js';
import { User }            from '../models/index.js';
import { sendEmail }       from './emailService.js';
import { getAdBasedWinners } from './adWinningService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

// ── In-app CRUD ───────────────────────────────────────────────────────────────

export async function createInAppNotification(userId, type, title, message, link = null) {
  await connectDB();
  try {
    await InAppNotification.create({ userId, type, title, message, link, read: false });
  } catch (err) {
    console.error('[notificationService] createInAppNotification failed:', err.message);
  }
}

export async function getNotifications(userId, limit = 20, offset = 0) {
  await connectDB();
  return InAppNotification.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

export async function getUnreadCount(userId) {
  await connectDB();
  return InAppNotification.countDocuments({ userId, read: false });
}

export async function markAsRead(notificationId, userId) {
  await connectDB();
  return InAppNotification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
}

export async function markAllAsRead(userId) {
  await connectDB();
  return InAppNotification.updateMany({ userId, read: false }, { read: true });
}

export async function deleteNotification(notificationId, userId) {
  await connectDB();
  return InAppNotification.findOneAndDelete({ _id: notificationId, userId });
}

// ── Product-winning alert ─────────────────────────────────────────────────────

export async function notifyWinningProduct(userId, product) {
  const title   = `New Winning Product: ${product.name}`;
  const message = `Win Score ${product.winScore}/100 · ${product.advertiserCount || 0} advertisers · ${product.totalAds || 0} ads`;
  const link    = `${FRONTEND_URL}/products`;
  await createInAppNotification(userId, 'alert', title, message, link);
}

// ── Daily digest email ────────────────────────────────────────────────────────

export async function sendDailyDigest() {
  await connectDB();

  const users   = await User.find({ dailyDigest: true, emailVerified: true }).lean();
  const winners = await getAdBasedWinners(10);

  if (winners.length === 0) {
    console.log('[notificationService] No winners to include in digest — skipping.');
    return;
  }

  let sent = 0;
  for (const user of users) {
    try {
      const productRows = winners.map((p, i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2d2d4e;color:#94a3b8;font-size:13px;">#${i + 1}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #2d2d4e;">
            <span style="color:#f8fafc;font-weight:600;font-size:14px;">${p.name}</span><br>
            <span style="color:#64748b;font-size:12px;">${p.advertiserCount || 0} advertisers &middot; ${p.totalAds || 0} ads &middot; ${p.maxDaysRunning || 0}d running</span>
          </td>
        </tr>
      `).join('');

      const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:-0.5px;">Daily Digest</h1>
            <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">Top 10 winning products found today</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${productRows}
            </table>
            <div style="text-align:center;margin-top:28px;">
              <a href="${FRONTEND_URL}/products"
                style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:8px;">
                View All Products
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2d2d4e;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              TrendSpy &mdash; Pakistan's #1 Product Hunting Tool<br>
              You are receiving this because you enabled daily digests in your profile.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await sendEmail(user.email, 'Daily Digest – Top Winning Products Today', html);
      await createInAppNotification(
        user._id,
        'daily_digest',
        'Daily Digest Ready',
        `Today's top pick: ${winners[0].name}. ${winners.length} products in your digest.`,
        `${FRONTEND_URL}/products`
      );
      sent++;
      console.log(`[notificationService] Digest sent to ${user.email}`);
    } catch (err) {
      console.error(`[notificationService] Digest failed for ${user.email}:`, err.message);
    }
  }

  console.log(`[notificationService] Daily digest complete — ${sent}/${users.length} sent.`);
}
