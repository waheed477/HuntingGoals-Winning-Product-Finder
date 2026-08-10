import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';

export const PUT = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Response.json(
        { success: false, error: 'Both current and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const dbUser = await User.findById(user._id).select('+password');
    if (!dbUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isMatch = await dbUser.comparePassword(currentPassword);
    if (!isMatch) {
      return Response.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    dbUser.password = newPassword;
    await dbUser.save();

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[PUT /api/user/password]', err);
    return Response.json({ success: false, error: 'Failed to update password' }, { status: 500 });
  }
});
