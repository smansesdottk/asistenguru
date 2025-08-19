import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

// --- START: Self-contained Auth Logic ---
const SESSION_COOKIE_NAME = 'app_session';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

async function verifySessionToken(token: string): Promise<UserProfile | null> {
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

function getSessionCookie(cookieHeader: string | undefined | null): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? sessionCookie.split('=')[1] : undefined;
}
// --- END: Self-contained Auth Logic ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const token = getSessionCookie(req.headers.cookie);

        if (!token) {
            return res.status(401).json({ error: 'No session token found.' });
        }

        const user = await verifySessionToken(token);

        if (!user) {
            return res.status(401).json({ error: 'Invalid session token.' });
        }
        
        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json({ error: 'Verification failed.' });
    }
}