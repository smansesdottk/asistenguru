import type { VercelRequest } from '@vercel/node';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export const SESSION_COOKIE_NAME = 'app_session';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

/**
 * Creates a JWT session token for a given user profile.
 * @param payload The user profile to encode in the token.
 * @returns A promise that resolves to the signed JWT string.
 */
export async function createSessionToken(payload: UserProfile): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set. Cannot create session.');
  }
  const secretKey = new TextEncoder().encode(jwtSecret);

  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Session is valid for 24 hours
    .sign(secretKey);
}

/**
 * Creates a Set-Cookie header string for the session token.
 * @param token The JWT session token.
 * @returns A formatted string for the Set-Cookie header.
 */
export function createSessionCookie(token: string): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    // Max-Age is 24 hours in seconds
    return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}

/**
 * Creates a Set-Cookie header string to clear the session cookie.
 * @returns A formatted string for the Set-Cookie header that expires the cookie.
 */
export function clearSessionCookie(): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}

/**
 * Verifies a JWT session token and returns the user profile if valid.
 * @param token The JWT string from the cookie.
 * @returns A promise that resolves to the user profile or null if invalid.
 */
export async function verifySessionToken(token: string): Promise<UserProfile | null> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not available. Cannot verify session token.');
    return null;
  }
  const secretKey = new TextEncoder().encode(jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserProfile;
  } catch (error) {
    // This is expected for expired or invalid tokens, so we log it for debugging but don't treat it as a server error.
    console.log('Token verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Parses the session cookie from the 'cookie' header string.
 * @param cookieHeader The value of the 'cookie' header.
 * @returns The session token string or undefined if not found.
 */
export function getSessionCookie(cookieHeader: string | undefined | null): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? sessionCookie.split('=')[1] : undefined;
}

/**
 * A custom error class for authentication failures.
 */
export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * A utility function to protect an API route. It verifies the session token
 * from the request cookies and returns the user profile.
 * Throws an AuthError if the session is invalid.
 * @param req The VercelRequest object.
 * @returns A promise that resolves to the authenticated user's profile.
 * @throws {AuthError} if authentication fails.
 */
export async function requireAuth(req: VercelRequest): Promise<UserProfile> {
    const token = getSessionCookie(req.headers.cookie);
    if (!token) {
      throw new AuthError('Unauthorized: No session token found.');
    }
    const user = await verifySessionToken(token);
    if (!user) {
        throw new AuthError('Unauthorized: Invalid or expired session token.');
    }
    return user;
}