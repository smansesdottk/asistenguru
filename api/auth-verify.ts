import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionToken, getSessionCookie } from '../_utils/auth';

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
