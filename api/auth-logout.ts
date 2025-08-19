import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- START: Self-contained Auth Logic ---
const SESSION_COOKIE_NAME = 'app_session';

function clearSessionCookie(): string {
    const isProduction = process.env.VERCEL_ENV === 'production';
    return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; ${isProduction ? 'Secure;' : ''} SameSite=Lax`;
}
// --- END: Self-contained Auth Logic ---

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ message: 'Logged out successfully.' });
}