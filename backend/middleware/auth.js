import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { User } from '@/models/index';

/**
 * Parse cookies from the Cookie header string into a key/value map.
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
}

/**
 * Extract JWT token from cookies or Authorization: Bearer header.
 */
function extractToken(request) {
  const cookies = parseCookies(request.headers.get('cookie'));
  if (cookies.token) return cookies.token;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  return null;
}

/**
 * Higher-order function that wraps a route handler with JWT authentication.
 * Passes the authenticated user as the third argument to the handler.
 *
 * Usage:
 *   export const GET = withAuth(async (request, context, user) => { ... });
 */
export function withAuth(handler) {
  return async function (request, context) {
    try {
      await connectDB();

      const token = extractToken(request);
      if (!token) {
        return Response.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return Response.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return Response.json(
          { success: false, error: 'User not found' },
          { status: 401 }
        );
      }
      if (user.isActive === false) {
        return Response.json(
          { success: false, error: 'Account deactivated' },
          { status: 403 }
        );
      }

      return handler(request, context, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return Response.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Generate a signed JWT for a user.
 */
export function generateToken(userId, email) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Build Set-Cookie header value for the auth token.
 */
export function buildTokenCookie(token) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Build Set-Cookie header value that clears the auth token.
 */
export function buildClearCookie() {
  return `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
