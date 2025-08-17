import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserProfile } from '../../types';

const JWT_SECRET_KEY = process.env.JWT_SECRET;
if (!JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
const SESSION_COOKIE_NAME = 'app_session';

export async function createSessionToken(payload: UserProfile): Promise<string> {
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Sesi berlaku selama 24 jam
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<UserProfile | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserProfile;
  } catch (error) {
    return null;
  }
}

export function getSessionCookie(cookieHeader: string | undefined | null): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? sessionCookie.split('=')[1] : undefined;
}

export function createSessionCookie(token: string): string {
    const isProduction = process.env.NETLIFY_CONTEXT === 'production';
    return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}

export function clearSessionCookie(): string {
    const isProduction = process.env.NETLIFY_CONTEXT === 'production';
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}