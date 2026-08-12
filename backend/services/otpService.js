import crypto from 'crypto';
import EmailVerification from '../models/EmailVerification.js';
// Unified transport (Resend HTTPS/API first, Gmail SMTP fallback) — see mailTransport.js
import { sendMail } from './mailTransport.js';

export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Kept export name/signature — password-reset flow imports this too.
export async function sendEmail(to, subject, html) {
  await sendMail({ to, subject, html });
}

function verificationEmailHtml(otp) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f23; color: #e5e7eb; padding: 20px; }
    .container { max-width: 500px; background: #1a1a3e; padding: 32px; border-radius: 16px; margin: 0 auto; border: 1px solid rgba(99,102,241,0.3); }
    h2 { color: #818cf8; margin-top: 0; }
    .otp { font-size: 40px; font-weight: bold; color: #818cf8; background: rgba(99,102,241,0.1); padding: 16px; text-align: center; letter-spacing: 8px; border-radius: 12px; border: 1px solid rgba(99,102,241,0.3); margin: 20px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email</h2>
    <p>Thank you for signing up for <strong>TrendSpy</strong> — Pakistan's #1 Product Hunter.</p>
    <p>Your verification code is:</p>
    <div class="otp">${otp}</div>
    <p>This code expires in <strong>15 minutes</strong>.</p>
    <p style="color:#9ca3af;font-size:13px;">If you didn't create an account, you can safely ignore this email.</p>
    <div class="footer">TrendSpy — Find winning products before your competitors</div>
  </div>
</body>
</html>`;
}

export async function sendVerificationOTP(email) {
  const otp = generateOTP();
  await EmailVerification.findOneAndUpdate(
    { email: email.toLowerCase(), purpose: 'verification' },
    { otp, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    { upsert: true, new: true }
  );
  await sendEmail(email, 'Verify Your Email — TrendSpy', verificationEmailHtml(otp));
  return { success: true };
}

export async function verifyOTP(email, otp, purpose = 'verification') {
  const record = await EmailVerification.findOne({
    email: email.toLowerCase(),
    otp,
    purpose,
  });
  if (!record) throw new Error('Invalid OTP. Please check the code and try again.');
  if (record.expiresAt < new Date()) throw new Error('OTP has expired. Please request a new one.');
  await EmailVerification.deleteOne({ _id: record._id });
  return { verified: true };
}

export async function resendVerificationOTP(email) {
  return sendVerificationOTP(email);
}
