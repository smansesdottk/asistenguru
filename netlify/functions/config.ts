import type { Handler } from "@netlify/functions";
import type { PublicConfig } from '../../types';

const handler: Handler = async () => {
  const config: PublicConfig = {
    schoolNameFull: process.env.SCHOOL_NAME_FULL,
    schoolNameShort: process.env.SCHOOL_NAME_SHORT,
    appVersion: process.env.APP_VERSION,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  };
};

export { handler };