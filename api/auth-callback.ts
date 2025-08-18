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
  const code = req.query.code as string | undefined;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_WORKSPACE_DOMAIN, APP_BASE_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_WORKSPACE_DOMAIN || !APP_BASE_URL) {
      return res.status(500).send('Server configuration error: Google Auth or App Base URL variables are missing.');
  }
  
  const redirectUri = `${APP_BASE_URL}/api/auth-callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.json();
      
      if (errorBody.error === 'redirect_uri_mismatch') {
        console.error("CRITICAL: GOOGLE REDIRECT URI MISMATCH. Compare this URL with the one in your Google Cloud Console.");
        console.error(`--> URI Sent to Google: "${redirectUri}"`);
      }

      console.error("Google Token Exchange Error:", errorBody);
      throw new Error(`Google token exchange failed: ${errorBody.error_description || tokenResponse.statusText}.`);
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    const userInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google.');
    }
    const userInfo = await userInfoResponse.json();

    if (userInfo.hd !== GOOGLE_WORKSPACE_DOMAIN) {
      return res.status(403).send(`Login failed. Please use an account from the @${GOOGLE_WORKSPACE_DOMAIN} domain.`);
    }

    const userProfile: UserProfile = {
      id: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
    };
    const sessionToken = await createSessionToken(userProfile);
    const sessionCookie = createSessionCookie(sessionToken);

    res.setHeader('Set-Cookie', sessionCookie);
    res.redirect(302, '/');

  } catch (error) {
    console.error('Authentication callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during authentication.';
    return res.status(500).send(`An error occurred: ${errorMessage}`);
  }
}