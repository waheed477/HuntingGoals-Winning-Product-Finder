/**
 * Creative Archive service — saves permanent copies of scraped ad images to a
 * FREE Cloudinary account, because FB CDN links expire after ~30-60 days
 * (which breaks AI identification and erases the winning-creative history).
 *
 * Uses Cloudinary's "unsigned upload preset" flow:
 *   - cloud name + preset name only → no API secret stored in this codebase
 *   - Cloudinary fetches the FB URL server-side → no bandwidth through us
 *   - env-gated: without CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET the
 *     whole feature is silently OFF (zero errors, zero behavior change)
 *
 * Quota respect: only ads with an image are archived, fully sequential with
 * delays, capped per run, max 3 attempts per ad.
 */

import axios from 'axios';
import { connectDB } from '../lib/db.js';
import ScrapedAd from '../models/ScrapedAd.js';

const MAX_PER_RUN    = 40;
const MAX_ATTEMPTS   = 3;
const RETRY_AFTER_MS = 6 * 3600 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function isArchiveConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET);
}

/** Upload one ad's image to Cloudinary; returns the permanent URL or null. */
export async function archiveAdImage(imageUrl) {
  if (!isArchiveConfigured() || !imageUrl) return null;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  try {
    const body = new URLSearchParams({
      file:          imageUrl,           // Cloudinary pulls the remote URL itself
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    });
    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 },
    );
    return res.data?.secure_url || null;
  } catch (err) {
    console.warn('[CreativeArchive] upload failed:', err?.response?.data?.error?.message || err.message);
    return null;
  }
}

/** Cron entry: archive the oldest valuable ads that still need a permanent copy. */
export async function archivePendingAds(limit = MAX_PER_RUN) {
  if (!isArchiveConfigured()) {
    return { archived: 0, failed: 0, skipped: 0, disabled: true };
  }
  await connectDB();

  const retryCutoff = new Date(Date.now() - RETRY_AFTER_MS);
  const candidates = await ScrapedAd.find({
    isActive:         true,
    imageUrl:         { $nin: [null, ''] },
    archivedImageUrl: null,
    archiveAttempts:  { $lt: MAX_ATTEMPTS },
    $or: [{ lastArchiveTry: null }, { lastArchiveTry: { $lt: retryCutoff } }],
  })
    .sort({ daysRunning: -1 })  // longest-running (most valuable) first
    .limit(limit);

  const results = { archived: 0, failed: 0, skipped: 0 };
  for (const ad of candidates) {
    const url = await archiveAdImage(ad.imageUrl);
    ad.archiveAttempts = (ad.archiveAttempts || 0) + 1;
    ad.lastArchiveTry  = new Date();
    if (url) {
      ad.archivedImageUrl = url;
      ad.archiveStatus    = 'done';
      results.archived++;
    } else {
      ad.archiveStatus = ad.archiveAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      results.failed++;
    }
    await ad.save().catch(() => {});
    await sleep(800 + Math.random() * 700); // easy on both APIs
  }
  return results;
}
