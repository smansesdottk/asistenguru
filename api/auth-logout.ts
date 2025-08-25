import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from './_utils/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ message: 'Logged out successfully.' });
}