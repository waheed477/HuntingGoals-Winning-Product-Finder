import { connectDB } from '@/lib/db';
import { sendPasswordResetOTP } from '@/services/passwordResetService';

export async function POST(request) {
  try {
    await connectDB();

    const { email } = await request.json();
    if (!email) {
      return Response.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    await sendPasswordResetOTP(email);

    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset code shortly',
    });
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
