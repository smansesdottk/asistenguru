// Creator: A. Indra Malik - SMAN11MKS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { requireAuth, AuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure the user is authenticated to check a job's status
    await requireAuth(req);

    const jobId = req.query.id as string;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const jobData: any = await kv.get(`job:${jobId}`);

    if (!jobData) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Return a public-safe status object
    const statusResponse = {
      status: jobData.status,
      statusMessage: jobData.statusMessage,
      result: jobData.result,
      error: jobData.error,
    };

    return res.status(200).json(statusResponse);

  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: error.message });
    }
    console.error("Error in /chat/status:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}