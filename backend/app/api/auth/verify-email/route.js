import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { verifyOTP } from '@/services/otpService';
import { generateToken, buildTokenCookie } from '@/middleware/auth';

export async function POST(request) {
  try {
    await connectDB();

    const { email, otp } = await request.json();
    if (!email || !otp) {
      return Response.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    await verifyOTP(email, otp, 'verification');

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { emailVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const token = generateToken(user._id, user.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id:            user._id,
            name:          user.name,
            email:         user.email,
            role:          user.role,
            emailVerified: user.emailVerified,
          },
          token,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildTokenCookie(token),
        },
      }
    );
  } catch (error) {
    console.error('[POST /api/auth/verify-email]', error);
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}
