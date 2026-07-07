import jwt from 'jsonwebtoken';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request, context, user) => {
  try {
    const socketToken = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    return Response.json({ success: true, data: { token: socketToken, expiresIn: 300 } });
  } catch (err) {
    console.error('[GET /api/socket/token]', err);
    return Response.json({ success: false, error: 'Failed to generate socket token' }, { status: 500 });
  }
});
