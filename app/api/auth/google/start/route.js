const GOOGLE_CLIENT_ID  = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI      = process.env.GOOGLE_REDIRECT_URI
  || 'http://localhost:3001/api/auth/google/callback';

export async function GET() {
  if (!GOOGLE_CLIENT_ID) {
    return Response.json(
      { success: false, error: 'Google OAuth is not configured on this server.' },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(url, 302);
}
