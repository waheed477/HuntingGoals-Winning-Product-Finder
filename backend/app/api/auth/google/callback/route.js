import { connectDB } from '@/lib/db';
import { User } from '@/models/index';
import { generateToken } from '@/middleware/auth';

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI         = process.env.GOOGLE_REDIRECT_URI
  || 'http://localhost:3001/api/auth/google/callback';
const FRONTEND_URL         = process.env.FRONTEND_URL || 'http://localhost:5000';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return Response.redirect(`${FRONTEND_URL}/login?error=google_cancelled`, 302);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Google OAuth] Token exchange failed:', tokenData);
      return Response.redirect(`${FRONTEND_URL}/login?error=google_token`, 302);
    }

    // Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return Response.redirect(`${FRONTEND_URL}/login?error=google_no_email`, 302);
    }

    await connectDB();

    // Find by googleId or email
    let user = await User.findOne({ googleId: profile.sub })
      || await User.findOne({ email: profile.email });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user.googleId     = profile.sub;
        user.googleEmail  = profile.email;
        user.authProvider = 'google';
        if (!user.emailVerified) user.emailVerified = true;
        await user.save();
      }
    } else {
      // Create new user via Google
      user = await User.create({
        name:          profile.name || profile.email.split('@')[0],
        email:         profile.email,
        googleId:      profile.sub,
        googleEmail:   profile.email,
        authProvider:  'google',
        emailVerified: true,
        profilePicture: profile.picture || null,
      });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = generateToken(user._id, user.email);
    const name  = encodeURIComponent(user.name || '');

    return Response.redirect(
      `${FRONTEND_URL}/login?google=success&token=${token}&name=${name}`,
      302
    );
  } catch (err) {
    console.error('[Google OAuth callback]', err);
    return Response.redirect(`${FRONTEND_URL}/login?error=google_server`, 302);
  }
}
