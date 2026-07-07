import { connectDB }   from '@/lib/db';
import { withAuth }    from '@/middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/services/notificationService';

// GET /api/notifications?limit=20&offset=0
async function handleGet(request, _context, user) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '20', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0',  10), 0);

  const [notifications, unread] = await Promise.all([
    getNotifications(user._id, limit, offset),
    getUnreadCount(user._id),
  ]);

  return Response.json({ success: true, data: { notifications, unread, limit, offset } });
}

// PUT /api/notifications  { notificationId: "<id>" | "all" }
async function handlePut(request, _context, user) {
  await connectDB();
  const body = await request.json().catch(() => ({}));
  const { notificationId } = body;

  if (!notificationId) {
    return Response.json({ success: false, error: 'notificationId required' }, { status: 400 });
  }

  if (notificationId === 'all') {
    await markAllAsRead(user._id);
  } else {
    await markAsRead(notificationId, user._id);
  }

  const unread = await getUnreadCount(user._id);
  return Response.json({ success: true, unread });
}

// DELETE /api/notifications?id=<notificationId>
async function handleDelete(request, _context, user) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const notificationId   = searchParams.get('id');

  if (!notificationId) {
    return Response.json({ success: false, error: 'id query param required' }, { status: 400 });
  }

  await deleteNotification(notificationId, user._id);
  return Response.json({ success: true });
}

export const GET    = withAuth(handleGet);
export const PUT    = withAuth(handlePut);
export const DELETE = withAuth(handleDelete);
