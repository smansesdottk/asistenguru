// Creator: A. Indra Malik - SMAN11MKS
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { requireAuth, AuthError } from '../_utils/auth';
import { randomUUID } from 'crypto';

function getInternalApiSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    console.error("CRITICAL: INTERNAL_API_SECRET is not set in environment variables.");
    throw new Error("Application is not configured correctly.");
  }
  return secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req);

    if (!req.body) {
      throw new Error('Request body is missing.');
    }

    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid request body: "messages" array is required.');
    }

    const jobId = randomUUID();
    const jobData = {
      status: 'PENDING',
      statusMessage: 'Menunggu untuk diproses...',
      user,
      input: { messages, model },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store the initial job data in KV. Set an expiration of 1 hour.
    await kv.set(`job:${jobId}`, jobData, { ex: 3600 });

    // Asynchronously trigger the processing endpoint. We don't wait for the response.
    // This is the "fire-and-forget" part.
    const processUrl = `${process.env.APP_BASE_URL}/api/chat/process`;
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Secret': getInternalApiSecret(),
      },
      body: JSON.stringify({ jobId }),
    }).catch(error => {
      // Log the error, but don't fail the user request. The user can still poll.
      // We might need a separate cleanup mechanism for jobs that fail to start.
      console.error(`Failed to trigger processing for job ${jobId}:`, error);
      // We could update the job status to FAILED here.
      kv.set(`job:${jobId}`, { ...jobData, status: 'FAILED', error: 'Failed to start processing.' });
    });

    // Immediately respond to the client with the job ID.
    return res.status(202).json({ jobId });

  } catch (error) {
    if (error instanceof AuthError) {
        return res.status(401).json({ error: error.message });
    }
    console.error("Error in /chat/start:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}