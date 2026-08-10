import { buildClearCookie } from '@/middleware/auth';

export async function POST() {
  return new Response(
    JSON.stringify({ success: true, data: { message: 'Logged out successfully' } }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildClearCookie(),
      },
    }
  );
}
