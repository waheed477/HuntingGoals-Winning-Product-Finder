import { connectDB }       from '@/lib/db';
import { withAuth }        from '@/middleware/auth';
import { User, Alert }     from '@/models/index';
import AlertLog            from '@/models/AlertLog.js';
import InAppNotification   from '@/models/InAppNotification.js';

async function handleExport(request, _context, user) {
  await connectDB();

  const [fullUser, alerts, alertLogs, notifications] = await Promise.all([
    User.findById(user._id).lean(),
    Alert.find({ userId: user._id }).lean(),
    AlertLog.find({ userId: user._id }).lean(),
    InAppNotification.find({ userId: user._id }).lean(),
  ]);

  if (!fullUser) {
    return Response.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const payload = {
    user: {
      name:                 fullUser.name,
      email:                fullUser.email,
      phoneNumber:          fullUser.phoneNumber   || null,
      city:                 fullUser.selectedCity  || null,
      categories:           fullUser.selectedCategories  || [],
      platforms:            fullUser.selectedPlatforms   || [],
      emailNotifications:   fullUser.emailNotifications,
      whatsappNotifications: fullUser.whatsappNotifications,
      dailyDigest:          fullUser.dailyDigest,
      subscriptionPlan:     fullUser.subscriptionPlan || 'free',
      createdAt:            fullUser.createdAt,
      lastLogin:            fullUser.lastLogin || null,
    },
    alerts: alerts.map((a) => ({
      city:         a.city         || null,
      category:     a.category     || null,
      minWinScore:  a.minWinScore,
      channel:      a.channel,
      isActive:     a.isActive,
      triggerCount: a.triggerCount || 0,
      createdAt:    a.createdAt,
    })),
    alertHistory: alertLogs.map((l) => ({
      productName: l.productName,
      winScore:    l.winScore,
      channel:     l.channel,
      delivered:   l.delivered,
      sentAt:      l.sentAt,
    })),
    notifications: notifications.map((n) => ({
      type:      n.type,
      title:     n.title,
      message:   n.message,
      read:      n.read,
      createdAt: n.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };

  await User.findByIdAndUpdate(user._id, {
    $set: { gdprExportedAt: new Date() },
  });

  return Response.json({ success: true, data: payload });
}

export const GET = withAuth(handleExport);
