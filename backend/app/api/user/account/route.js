import { connectDB }      from '@/lib/db';
import { User, Alert }    from '@/models/index';
import AlertLog           from '@/models/AlertLog.js';
import InAppNotification  from '@/models/InAppNotification.js';
import { withAuth }       from '@/middleware/auth';

export const DELETE = withAuth(async (request, _context, user) => {
  try {
    await connectDB();

    await Promise.all([
      Alert.deleteMany({ userId: user._id }),
      AlertLog.deleteMany({ userId: user._id }),
      InAppNotification.deleteMany({ userId: user._id }),
    ]);

    await User.findByIdAndDelete(user._id);

    return Response.json({
      success: true,
      message: 'Account and all associated data permanently deleted.',
    });
  } catch (err) {
    console.error('[DELETE /api/user/account]', err);
    return Response.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
});
