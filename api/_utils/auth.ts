import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const SESSION_COOKIE_NAME = 'app_session';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

export async function createSessionToken(payload: UserProfile): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set. Cannot create session.');
  }
  const secretKey = new TextEncoder().encode(jwtSecret);

  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Sesi berlaku selama 24 jam
    .sign(secretKey);
}

export function createSessionCookie(token: string): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}

export function clearSessionCookie(): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}

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
    console.log('Token verification failed:', error);
    return null;
  }
}

export function getSessionCookie(cookieHeader: string | undefined | null): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? sessionCookie.split('=')[1] : undefined;
}
