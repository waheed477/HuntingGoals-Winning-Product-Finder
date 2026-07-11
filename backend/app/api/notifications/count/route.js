import { connectDB }    from '@/lib/db';
import { withAuth }     from '@/middleware/auth';
import { getUnreadCount } from '@/services/notificationService';

async function handleGet(_request, _context, user) {
  await connectDB();
  const unread = await getUnreadCount(user._id);
  return Response.json({ success: true, unread });
}

export const GET = withAuth(handleGet);
