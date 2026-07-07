import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { generateToken, buildTokenCookie } from '@/middleware/auth';
import { isValidEmail } from '@/lib/validators';

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !isValidEmail(email)) {
      return Response.json(
        { success: false, error: 'A valid email is required' },
        { status: 400 }
      );
    }
    if (!password) {
      return Response.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // findByEmail includes password field (excluded by default)
    const user = await User.findByEmail(email);
    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update lastLogin without triggering pre-save hooks
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

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
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildTokenCookie(token),
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
