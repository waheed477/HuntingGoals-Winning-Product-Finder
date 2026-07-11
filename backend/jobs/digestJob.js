import cron            from 'node-cron';
import { sendDailyDigest } from '../services/notificationService.js';

export function startDigestJob() {
  // Run at 8:00 AM PKT daily (UTC+5 → 03:00 UTC)
  cron.schedule('0 3 * * *', async () => {
    console.log(`[${new Date().toISOString()}] [DigestJob] Sending daily digest…`);
    try {
      await sendDailyDigest();
    } catch (err) {
      console.error('[DigestJob] Failed:', err.message);
    }
  });

  console.log('[DigestJob] Scheduled — runs at 08:00 PKT (03:00 UTC) daily.');
}
