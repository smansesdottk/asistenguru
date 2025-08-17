import type { Handler, HandlerEvent } from '@netlify/functions';
import { createSessionCookie, createSessionToken } from '../util/auth';
import { timingSafeEqual } from 'crypto';

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { ADMIN_PASSWORD } = process.env;
    if (!ADMIN_PASSWORD) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Admin password not configured.' }) };
    }

    try {
        if (!event.body) {
            throw new Error('Password required.');
        }

        const { password } = JSON.parse(event.body);
        if (!password) {
            throw new Error('Password required.');
        }
        
        // Gunakan timingSafeEqual untuk mencegah timing attacks
        const providedPass = Buffer.from(password, 'utf8');
        const correctPass = Buffer.from(ADMIN_PASSWORD, 'utf8');
        
        const passwordsMatch = providedPass.length === correctPass.length && timingSafeEqual(providedPass, correctPass);

        if (!passwordsMatch) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid password.' }) };
        }

        const adminProfile = {
            id: 'admin',
            name: 'Admin',
            email: 'admin@internal',
            picture: '/admin-avatar.png', // Sediakan avatar default untuk admin
            isAdmin: true,
        };

        const sessionToken = await createSessionToken(adminProfile);
        const sessionCookie = createSessionCookie(sessionToken);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': sessionCookie,
            },
            body: JSON.stringify({ message: 'Admin login successful.' }),
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }
};

export { handler };