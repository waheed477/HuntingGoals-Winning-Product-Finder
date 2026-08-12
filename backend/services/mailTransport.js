// ─────────────────────────────────────────────────────────────────────────────
// Unified email transport.
//
// Priority 1 — Resend API (plain HTTPS POST, port 443) — chosen when
//              RESEND_API_KEY is set. Works on hosts that BLOCK outbound SMTP
//              (e.g. Render free tier, which is why this module exists).
// Priority 2 — Gmail SMTP via nodemailer (the legacy path) — unchanged
//              behaviour for hosts where 465/587 is open.
//
// Every outbound email in the app (OTP verify, password reset, win-score
// alerts, daily digest) funnels through sendMail() here, so switching
// providers is a single env-var change: set RESEND_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';

const RESEND_API = 'https://api.resend.com/emails';
// onboarding@resend.dev is Resend's built-in sandbox sender — delivers only to
// the Resend account owner's own email. For real users, verify a domain in the
// Resend dashboard and set RESEND_FROM (e.g. "TrendSpy <otp@yourdomain.com>").
const DEFAULT_RESEND_FROM = 'TrendSpy <onboarding@resend.dev>';

export function usingResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isEmailConfigured() {
  return usingResend() || Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/**
 * sendMail — the single send path for every email in the app.
 * @param {{to: string, subject: string, html: string, fromName?: string}} opts
 */
export async function sendMail({ to, subject, html, fromName = 'TrendSpy' }) {
  if (usingResend()) {
    const from = process.env.RESEND_FROM || DEFAULT_RESEND_FROM;
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Resend API ${res.status}: ${data.message || res.statusText || 'send failed'}`);
    }
    console.log(`[Email] (Resend) Sent "${subject}" to ${to} — id: ${data.id}`);
    return data;
  }

  // ── Legacy Gmail SMTP path (unchanged) ────────────────────────────────────
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error(
      'Email is not configured: set RESEND_API_KEY (works where SMTP is blocked) ' +
      'or EMAIL_USER + EMAIL_PASS (Gmail SMTP).'
    );
  }
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  const info = await transporter.sendMail({ from: `"${fromName}" <${user}>`, to, subject, html });
  console.log(`[Email] (SMTP) Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
  return info;
}

/**
 * Startup self-check — never throws. Emails must degrade loudly, not silently,
 * and must never prevent boot. Behaviour mirrors the old SMTP verify.
 */
export async function verifyTransport() {
  if (usingResend()) {
    try {
      const res = await Promise.race([
        // Cheap authenticated read — verifies the key without sending anything
        fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Resend API check timed out after 10s')), 10_000)),
      ]);
      if (res.ok) {
        const from = process.env.RESEND_FROM || DEFAULT_RESEND_FROM;
        console.log(`[Email] ✅ Resend API key verified — OTP/alert emails deliverable (sender: ${from})`);
        if (!process.env.RESEND_FROM) {
          console.warn('[Email] ℹ️  RESEND_FROM not set — using sandbox sender; emails go ONLY to your Resend account email until you verify a domain and set RESEND_FROM.');
        }
        return true;
      }
      console.warn(`[Email] ⚠️  Resend API key check returned HTTP ${res.status} — emails will fail. Regenerate the key at resend.com/api-keys.`);
      return false;
    } catch (err) {
      console.warn(`[Email] ⚠️  Resend self-check FAILED (${err.message}). Emails will fail until this is fixed.`);
      return false;
    }
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(
      '[Email] ⚠️  No email provider configured — OTP/alert/digest emails are DISABLED. ' +
      'Set RESEND_API_KEY (recommended on SMTP-blocked hosts) or EMAIL_USER/EMAIL_PASS.'
    );
    return false;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP verify timed out after 10s')), 10_000)),
    ]);
    console.log('[Email] ✅ SMTP connection verified — alert & digest emails are deliverable.');
    return true;
  } catch (err) {
    console.warn(
      `[Email] ⚠️  SMTP self-check FAILED (${err.message}). ` +
      'Gmail App Password valid? Outbound 465/587 blocked by host? ' +
      'Tip: set RESEND_API_KEY to bypass SMTP entirely.'
    );
    return false;
  }
}
