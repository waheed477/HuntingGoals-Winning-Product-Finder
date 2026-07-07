import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';
import { generateApiKey } from '@/utils/generateApiKey';

export const POST = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const dbUser = await User.findById(user._id).select('subscriptionPlan');
    if (!dbUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (dbUser.subscriptionPlan === 'free') {
      return Response.json(
        { success: false, error: 'API key access requires a Pro or Business plan' },
        { status: 403 }
      );
    }

    const apiKey = generateApiKey();

    await User.findByIdAndUpdate(user._id, {
      $set: { apiKey, apiKeyGeneratedAt: new Date() },
    });

    return Response.json({ success: true, data: { apiKey } });
  } catch (err) {
    console.error('[POST /api/user/apikey]', err);
    return Response.json({ success: false, error: 'Failed to generate API key' }, { status: 500 });
  }
});
