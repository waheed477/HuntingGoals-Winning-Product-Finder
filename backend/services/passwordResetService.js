import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import EmailVerification from '../models/EmailVerification.js';
import User from '../models/User.js';
import { sendEmail } from './otpService.js';

function resetEmailHtml(otp) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f23; color: #e5e7eb; padding: 20px; }
    .container { max-width: 500px; background: #1a1a3e; padding: 32px; border-radius: 16px; margin: 0 auto; border: 1px solid rgba(249,115,22,0.3); }
    h2 { color: #fb923c; margin-top: 0; }
    .otp { font-size: 40px; font-weight: bold; color: #fb923c; background: rgba(249,115,22,0.1); padding: 16px; text-align: center; letter-spacing: 8px; border-radius: 12px; border: 1px solid rgba(249,115,22,0.3); margin: 20px 0; }
    .warning { color: #f87171; font-size: 13px; margin-top: 12px; }
    .footer { margin-top: 24px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>We received a request to reset the password for your <strong>TrendSpy</strong> account.</p>
    <p>Your password reset code is:</p>
    <div class="otp">${otp}</div>
    <p>This code expires in <strong>15 minutes</strong>.</p>
    <p class="warning">If you didn't request this, please ignore this email. Your password will not be changed.</p>
    <div class="footer">TrendSpy — Pakistan's #1 Product Hunter</div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetOTP(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { success: true, message: 'If an account exists, you will receive a reset code' };
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  await EmailVerification.findOneAndUpdate(
    { email: email.toLowerCase(), purpose: 'reset' },
    { otp, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    { upsert: true, new: true }
  );

  await sendEmail(email, 'Reset Your Password — TrendSpy', resetEmailHtml(otp));
  return { success: true };
}

export async function resetPassword(email, otp, newPassword) {
  const record = await EmailVerification.findOne({
    email: email.toLowerCase(),
    otp,
    purpose: 'reset',
  });
  if (!record) throw new Error('Invalid OTP. Please check the code and try again.');
  if (record.expiresAt < new Date()) throw new Error('OTP has expired. Please request a new one.');

  const hashed = await bcrypt.hash(newPassword, 12);
  const updated = await User.updateOne(
    { email: email.toLowerCase() },
    { password: hashed }
  );
  if (updated.matchedCount === 0) throw new Error('User not found.');

  await EmailVerification.deleteOne({ _id: record._id });
  return { success: true };
}
