import cron from 'node-cron';
import { checkAllProductsForAlerts } from '@/services/alertService';

export function startAlertJob() {
  if (process.env.ALERTS_ENABLED !== 'true') {
    console.log('[AlertJob] Disabled — set ALERTS_ENABLED=true in Replit Secrets to enable.');
    return;
  }

  cron.schedule('*/30 * * * *', async () => {
    console.log(`[AlertJob] Running alert check at ${new Date().toISOString()}…`);
    try {
      const result = await checkAllProductsForAlerts();
      console.log(
        `[AlertJob] Done. Triggered: ${result.triggered ?? '?'} | ` +
        `WhatsApp: ${result.whatsapp} | Email: ${result.email}` +
        (result.errors.length ? ` | Errors: ${result.errors.length}` : '')
      );
    } catch (err) {
      console.error('[AlertJob] Fatal error:', err.message);
    }
  });

  console.log('[AlertJob] Scheduled: every 30 minutes');
}
