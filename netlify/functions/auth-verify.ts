import type { Handler, HandlerEvent } from '@netlify/functions';
import { getSessionCookie, verifySessionToken } from '../util/auth';

const handler: Handler = async (event: HandlerEvent) => {
    try {
        const token = getSessionCookie(event.headers.cookie);

        if (!token) {
            return { statusCode: 401, body: JSON.stringify({ error: 'No session token found.' }) };
        }

        const user = await verifySessionToken(token);

        if (!user) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session token.' }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Verification failed.' }) };
    }
};

export { handler };