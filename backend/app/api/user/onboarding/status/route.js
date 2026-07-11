import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request, context, user) => {
  try {
    await connectDB();

    const dbUser = await User.findById(user._id)
      .select('onboardingCompleted selectedCategories selectedCity selectedPlatforms')
      .lean();

    if (!dbUser) {
      return Response.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        needsOnboarding: !dbUser.onboardingCompleted,
        userPreferences: {
          categories: dbUser.selectedCategories || [],
          city:        dbUser.selectedCity      || null,
          platforms:   dbUser.selectedPlatforms || [],
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/user/onboarding/status]', err);
    return Response.json({ success: false, error: 'Failed to check onboarding status' }, { status: 500 });
  }
});
