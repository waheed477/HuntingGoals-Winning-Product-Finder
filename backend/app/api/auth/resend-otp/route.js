import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { sendVerificationOTP } from '@/services/otpService';

export async function POST(request) {
  try {
    await connectDB();

    const { email } = await request.json();
    if (!email) {
      return Response.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return Response.json({ success: false, error: 'No account found with this email' }, { status: 404 });
    }

    if (user.emailVerified) {
      return Response.json({ success: false, error: 'Email is already verified' }, { status: 400 });
    }

    await sendVerificationOTP(email);

    return Response.json({ success: true, message: 'Verification code resent to your email' });
  } catch (error) {
    console.error('[POST /api/auth/resend-otp]', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
