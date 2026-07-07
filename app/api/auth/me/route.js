import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request, context, user) => {
  return Response.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        telegramChatId: user.telegramChatId,
        emailNotifications: user.emailNotifications,
        telegramNotifications: user.telegramNotifications,
        dailyDigest: user.dailyDigest,
        digestTime: user.digestTime,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    },
  });
});
