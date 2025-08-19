import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, type JWTPayload } from 'jose';

// --- START: Self-contained Auth Logic ---
const SESSION_COOKIE_NAME = 'app_session';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

async function createSessionToken(payload: UserProfile): Promise<string> {
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

function createSessionCookie(token: string): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}
// --- END: Self-contained Auth Logic ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { ADMIN_PASSWORD } = process.env;
    if (!ADMIN_PASSWORD) {
        console.error('CRITICAL: ADMIN_PASSWORD environment variable is missing.');
        return res.status(500).json({ error: 'Admin password not configured on server.' });
    }

    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password required.' });
        }
        
        const passwordsMatch = password === ADMIN_PASSWORD;

        if (!passwordsMatch) {
            return res.status(401).json({ error: 'Invalid password.' });
        }

        const adminProfile: UserProfile = {
            id: 'admin',
            name: 'Admin',
            email: 'admin@internal',
            picture: 'data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'currentColor\'%3e%3cpath d=\'M12 3.25a.75.75 0 01.75.75v3.18l3.9-2.25a.75.75 0 01.75 1.3l-4.25 2.454a.75.75 0 01-.75 0L7.85 6.18a.75.75 0 01.75-1.3l3.9 2.25V4a.75.75 0 01.75-.75z\' /%3e%3cpath fill-rule=\'evenodd\' d=\'M3 8.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zM4.5 10.5a.75.75 0 01.75-.75h13.5a.75.75 0 010 1.5H5.25a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h12a.75.75 0 000-1.5h-12zM3 18a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zM5.057 14.492a.75.75 0 01.638-.938 7.5 7.5 0 018.61 0 .75.75 0 01.638.938l-1.01 3.49-1.393-.402a.75.75 0 01-.638.938 5.25 5.25 0 00-3.804 0 .75.75 0 01-.638-.938l-1.393.403-1.01-3.49z\' clip-rule=\'evenodd\' /%3e%3c/svg%3e',
            isAdmin: true,
        };

        const sessionToken = await createSessionToken(adminProfile);
        const sessionCookie = createSessionCookie(sessionToken);
        
        res.setHeader('Set-Cookie', sessionCookie);
        return res.status(200).json({ message: 'Admin login successful.' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error('Error during admin login process:', error);
        return res.status(500).json({ error: errorMessage });
    }
}