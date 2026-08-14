// ─────────────────────────────────────────────────────────────────────────────
// Unified email transport.
//
// Priority 1 — Brevo API (HTTPS, api.brevo.com) — chosen when BREVO_API_KEY
//              is set. Free 300 emails/day; a click-verified Gmail can be the
//              sender (NO domain needed) — ideal for OTP/magic links.
// Priority 2 — Resend API (HTTPS) — needs a verified domain for real users.
// Priority 3 — Gmail SMTP via nodemailer — only where 465/587 is open.
//
// Every outbound email in the app (magic links, password reset, win-score
// alerts, daily digest) funnels through sendMail() here, so switching
// providers is a single env-var change.
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';

const RESEND_API = 'https://api.resend.com/emails';
const BREVO_API  = 'https://api.brevo.com/v3/smtp/email';
// onboarding@resend.dev is Resend's built-in sandbox sender — delivers only to
// the Resend account owner's own email. For real users, verify a domain in the
// Resend dashboard and set RESEND_FROM (e.g. "TrendSpy <otp@yourdomain.com>").
const DEFAULT_RESEND_FROM = 'TrendSpy <onboarding@resend.dev>';

export function usingResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function usingBrevo() {
  return Boolean(process.env.BREVO_API_KEY);
}

export function isEmailConfigured() {
  return usingBrevo() || usingResend() || Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/**
 * sendMail — the single send path for every email in the app.
 * @param {{to: string, subject: string, html: string, fromName?: string}} opts
 */
export async function sendMail({ to, subject, html, fromName = 'TrendSpy' }) {
  if (usingBrevo()) {
    // Brevo requires a verified sender; a click-verified Gmail works fine.
    const fromEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
    if (!fromEmail) {
      throw new Error('BREVO_SENDER_EMAIL is required with BREVO_API_KEY (a Brevo-verified sender, e.g. your Gmail).');
    }
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { email: fromEmail, name: fromName },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Brevo API ${res.status}: ${data.message || res.statusText || 'send failed'}`);
    }
    console.log(`[Email] (Brevo) Sent "${subject}" to ${to} — id: ${data.messageId}`);
    return data;
  }

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
  if (usingBrevo()) {
    try {
      const res = await Promise.race([
        fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': process.env.BREVO_API_KEY },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Brevo API check timed out after 10s')), 10_000)),
      ]);
      if (res.ok) {
        console.log(`[Email] ✅ Brevo API key verified — OTP/magic-link/alert emails deliverable (sender: ${process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'UNSET — set BREVO_SENDER_EMAIL!'})`);
        return true;
      }
      console.warn(`[Email] ⚠️  Brevo API key check returned HTTP ${res.status} — emails will fail. Regenerate in Brevo → SMTP & API → API Keys.`);
      return false;
    } catch (err) {
      console.warn(`[Email] ⚠️  Brevo self-check FAILED (${err.message}). Emails will fail until this is fixed.`);
      return false;
    }
  }

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
