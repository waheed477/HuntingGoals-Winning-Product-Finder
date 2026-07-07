import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { generateToken, buildTokenCookie } from '@/middleware/auth';
import { isValidEmail } from '@/lib/validators';
import { sendVerificationOTP } from '@/services/otpService';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return Response.json({ success: false, error: 'A valid email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (!existing.emailVerified && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendVerificationOTP(email.toLowerCase()).catch(() => {});
        return Response.json({
          success: true,
          requiresVerification: true,
          email: email.toLowerCase(),
          message: 'Account exists but email is unverified. A new code has been sent.',
        });
      }
      return Response.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const user = await User.create({
      name:          name.trim(),
      email:         email.toLowerCase(),
      password,
      emailVerified: false,
    });

    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (emailConfigured) {
      await sendVerificationOTP(user.email);
      return Response.json(
        {
          success: true,
          requiresVerification: true,
          email: user.email,
          message: 'Verification code sent to your email',
        },
        { status: 201 }
      );
    }

    // Email not configured — skip verification, issue token immediately
    const token = generateToken(user._id, user.email);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: { id: user._id, name: user.name, email: user.email, role: user.role },
          token,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildTokenCookie(token),
        },
      }
    );
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
