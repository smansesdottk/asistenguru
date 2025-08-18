
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PublicConfig } from '../types';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { 
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET, 
    GOOGLE_WORKSPACE_DOMAIN,
    SCHOOL_NAME_FULL,
    SCHOOL_NAME_SHORT,
    APP_VERSION,
    APP_BASE_URL
  } = process.env;

  const isGoogleLoginConfigured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_WORKSPACE_DOMAIN && APP_BASE_URL);

  const config: PublicConfig = {
    schoolNameFull: SCHOOL_NAME_FULL,
    schoolNameShort: SCHOOL_NAME_SHORT,
    appVersion: APP_VERSION,
    googleClientId: GOOGLE_CLIENT_ID,
    isGoogleLoginConfigured: isGoogleLoginConfigured,
    appBaseUrl: APP_BASE_URL,
  };

  return res.status(200).json(config);
}