import { connectDB } from '@/lib/db';
import { Alert } from '@/models/index';
import { withAuth } from '@/middleware/auth';

export const DELETE = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const { id } = context.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      return Response.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    if (alert.userId.toString() !== user._id.toString()) {
      return Response.json({ success: false, error: 'Not authorized to delete this alert' }, { status: 403 });
    }

    await Alert.findByIdAndDelete(id);
    return Response.json({ success: true, message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/alerts/:id]', err);
    return Response.json({ success: false, error: 'Failed to delete alert' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const { id } = context.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      return Response.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    if (alert.userId.toString() !== user._id.toString()) {
      return Response.json({ success: false, error: 'Not authorized to update this alert' }, { status: 403 });
    }

    alert.isActive = !alert.isActive;
    await alert.save();

    return Response.json({
      success: true,
      data: { alert },
      message: `Alert ${alert.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    console.error('[PUT /api/alerts/:id]', err);
    return Response.json({ success: false, error: 'Failed to update alert' }, { status: 500 });
  }
});
