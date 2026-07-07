import { connectDB } from '@/lib/db';
import { resetPassword } from '@/services/passwordResetService';

export async function POST(request) {
  try {
    await connectDB();

    const { email, otp, newPassword } = await request.json();
    if (!email || !otp || !newPassword) {
      return Response.json(
        { success: false, error: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await resetPassword(email, otp, newPassword);

    return Response.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[POST /api/auth/reset-password]', error);
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}
