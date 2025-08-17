import type { Handler } from '@netlify/functions';
import { clearSessionCookie } from '../util/auth';

const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': clearSessionCookie(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Logged out successfully.' }),
  };
};

export { handler };