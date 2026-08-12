import cron from 'node-cron';
import { archivePendingAds, isArchiveConfigured } from '../services/creativeArchiveService.js';

// Archives scraped ad creatives to Cloudinary so they outlive FB CDN expiry.
// Every 3 hours, ≤40 ads/run, silently OFF until Cloudinary env vars are set.
export function startArchiveJob() {
  if (!isArchiveConfigured()) {
    console.log('[ArchiveJob] Cloudinary not configured — creative archival disabled (set CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET).');
    return;
  }

  cron.schedule('17 */3 * * *', async () => {
    try {
      const r = await archivePendingAds();
      if (r.archived || r.failed) {
        console.log(`[ArchiveJob] archived: ${r.archived}, failed: ${r.failed}`);
      }
    } catch (err) {
      console.error('[ArchiveJob] failed:', err.message);
    }
  });

  console.log('[ArchiveJob] Scheduled: every 3 hours (≤40 ads/run, sequential)');
}
