import type { Handler, HandlerEvent } from '@netlify/functions';
import { createSessionCookie, createSessionToken } from '../util/auth';

const handler: Handler = async (event: HandlerEvent) => {
  const { code } = event.queryStringParameters || {};

  if (!code) {
    return { statusCode: 400, body: 'Authorization code is missing.' };
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_WORKSPACE_DOMAIN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_WORKSPACE_DOMAIN) {
      return { statusCode: 500, body: 'Server configuration error: Google Auth variables missing.' };
  }
  
  const redirectUri = `${new URL(event.rawUrl).origin}/.netlify/functions/auth-callback`;

  try {
    // 1. Tukar kode otorisasi dengan token
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
      throw new Error(`Google token exchange failed: ${errorBody.error_description || tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    // 2. Dapatkan informasi pengguna dari id_token
    const userInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google.');
    }
    const userInfo = await userInfoResponse.json();

    // 3. Validasi domain workspace (hosted domain)
    if (userInfo.hd !== GOOGLE_WORKSPACE_DOMAIN) {
      return {
        statusCode: 403,
        body: `Login failed. Please use an account from the @${GOOGLE_WORKSPACE_DOMAIN} domain.`,
      };
    }

    // 4. Buat token sesi (JWT)
    const userProfile = {
      id: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture,
    };
    const sessionToken = await createSessionToken(userProfile);
    const sessionCookie = createSessionCookie(sessionToken);

    // 5. Arahkan pengguna kembali ke halaman utama dengan cookie sesi
    return {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': sessionCookie,
      },
      body: '',
    };
  } catch (error) {
    console.error('Authentication callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during authentication.';
    return { statusCode: 500, body: `An error occurred: ${errorMessage}` };
  }
};

export { handler };