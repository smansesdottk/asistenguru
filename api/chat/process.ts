// Creator: A. Indra Malik - SMAN11MKS
import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from "@vercel/kv";
import Papa from "papaparse";
import type { UserProfile } from "../_utils/auth";

// --- START: Self-contained types to avoid path issues ---
enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

interface ChatMessage {
  role: MessageRole;
  text: string;
}
// --- END: Types ---


// --- START: Caching Implementation ---
interface SchoolDataCache {
  data: Record<string, string>;
  timestamp: number;
}
let schoolDataCache: SchoolDataCache | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // Cache valid for 10 minutes
// --- END: Caching Implementation ---


// --- START: API Key Rotation and AI Action Logic ---
let keyIndex = 0;
async function performAiActionWithRetry<T>(action: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    const apiKeysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) throw new Error("GEMINI_API_KEYS environment variable not configured.");
    
    for (let i = 0; i < apiKeys.length; i++) {
        const currentKeyIndex = (keyIndex + i) % apiKeys.length;
        const apiKey = apiKeys[currentKeyIndex];
        try {
            const ai = new GoogleGenAI({ apiKey });
            const result = await action(ai);
            keyIndex = (currentKeyIndex + 1) % apiKeys.length;
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
            if (!isRateLimitError) {
                keyIndex = (currentKeyIndex + 1) % apiKeys.length;
                throw error;
            }
        }
    }
    throw new Error("Semua koneksi API sedang sibuk. Silakan coba lagi nanti.");
}
// --- END: AI Logic ---


// --- START: Data Source and Context Logic ---
function getPairedDataSources(): { name: string; url: string }[] {
    const urls = (process.env.ORGANIZATION_DATA_SOURCES || '').split(',').map(u => u.trim()).filter(Boolean);
    const names = (process.env.SHEET_NAMES || '').split(',').map(n => n.trim().toUpperCase()).filter(Boolean);
    return urls.map((url, i) => ({ name: names[i] || `DATA_${i + 1}`, url }));
}

async function fetchAndCacheSchoolData(): Promise<Record<string, string>> {
    const now = Date.now();
    if (schoolDataCache && (now - schoolDataCache.timestamp <= CACHE_DURATION_MS)) {
        console.log("Using cached school data for processing.");
        return schoolDataCache.data;
    }
    console.log("Cache is stale or empty. Fetching new school data for processing...");
    const sources = getPairedDataSources();
    if (sources.length === 0) throw new Error("ORGANIZATION_DATA_SOURCES not configured.");
    
    const responses = await Promise.all(sources.map(s => fetch(s.url)));
    const textData = await Promise.all(responses.map((res, i) => {
        if (!res.ok) throw new Error(`Failed to fetch ${sources[i].url}: ${res.statusText}`);
        return res.text();
    }));
    
    const fetchedData = sources.reduce((acc, source, i) => {
        acc[source.name] = textData[i];
        return acc;
    }, {} as Record<string, string>);

    schoolDataCache = { data: fetchedData, timestamp: now };
    return fetchedData;
}

function getSchoolDataContext(schoolData: Record<string, string>): Record<string, { headers: string[] }> {
    const context: Record<string, { headers: string[] }> = {};
    for (const [name, csvData] of Object.entries(schoolData)) {
        if (csvData) {
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
            if (parsed.meta.fields) {
                context[name] = { headers: parsed.meta.fields };
            }
        }
    }
    return context;
}
// --- END: Data Logic ---


async function processJob(jobId: string) {
  try {
    const jobKey = `job:${jobId}`;
    let jobData: any = await kv.get(jobKey);
    if (!jobData) throw new Error(`Job ${jobId} not found.`);

    // 1. Set status to PROCESSING
    jobData.status = 'PROCESSING';
    jobData.statusMessage = 'Menganalisis data...';
    jobData.updatedAt = Date.now();
    await kv.set(jobKey, jobData, { ex: 3600 });
    
    const { messages, model } = jobData.input;
    const modelToUse = model || 'gemini-2.5-flash';
    const userMessage = messages[messages.length - 1];

    const schoolData = await fetchAndCacheSchoolData();

    // 2. Retrieval Step
    const dataContext = getSchoolDataContext(schoolData);
    const retrievalSchema = {
      type: Type.OBJECT,
      properties: {
        searches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { sheetName: { type: Type.STRING }, filters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { column: { type: Type.STRING }, value: { type: Type.STRING }}}}}}}}
      }
    };
    const retrievalPrompt = `Analyze the user's question and the available data schemas to determine which sheets and filters are needed. Question: "${userMessage.text}". Schemas: ${JSON.stringify(dataContext)}. Return only relevant sheets. Use broad 'contains' logic for filters.`;
    const retrievalResponse = await performAiActionWithRetry(ai => ai.models.generateContent({ model: modelToUse, contents: retrievalPrompt, config: { responseMimeType: "application/json", responseSchema: retrievalSchema }}));
    const searches = JSON.parse(retrievalResponse.text ?? '{"searches":[]}').searches || [];

    // 3. Filtering Step
    const focusedData: Record<string, string> = {};
    for (const search of searches) {
        const csvData = schoolData[search.sheetName.toUpperCase()];
        if (!csvData) continue;
        if (!search.filters || search.filters.length === 0) {
            focusedData[search.sheetName] = csvData;
        } else {
            let filteredRows = Papa.parse(csvData, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
            for (const filter of search.filters) {
                if (filter.column && filter.value) {
                    filteredRows = filteredRows.filter(row => String(row[filter.column] || '').toLowerCase().includes(String(filter.value).toLowerCase()));
                }
            }
            if (filteredRows.length > 0) focusedData[search.sheetName] = Papa.unparse(filteredRows);
        }
    }

    // 4. Generation Step
    jobData.statusMessage = 'Menghasilkan respons...';
    jobData.updatedAt = Date.now();
    await kv.set(jobKey, jobData, { ex: 3600 });

    let finalSystemInstruction: string;
    if (Object.keys(focusedData).length === 0) {
        finalSystemInstruction = `Anda adalah "Asisten Guru AI". Jawab pertanyaan: "${userMessage.text}". Beritahu pengguna dengan sopan bahwa data yang relevan tidak ditemukan atau pertanyaan mereka mungkin di luar lingkup data sekolah.`;
    } else {
        finalSystemInstruction = `Anda adalah "Asisten Guru AI". Gunakan HANYA data CSV dalam format string JSON berikut untuk menjawab pertanyaan pengguna. Kunci JSON adalah nama data. Sajikan jawaban yang jelas, buat tabel jika diminta. Jika diminta visualisasi (grafik), buat blok JSON yang dibungkus [CHART_DATA]...[/CHART_DATA] dengan struktur: {"type":"pie|bar","title":"...","data":{...}}. Data: ${JSON.stringify(focusedData)}`;
    }
    
    const history = messages.slice(0, -1).map((msg: ChatMessage) => ({ role: msg.role, parts: [{ text: msg.text }] }));
    const chat = (new GoogleGenAI({apiKey: process.env.GEMINI_API_KEYS?.split(',')[0]})).chats.create({ model: modelToUse, config: { systemInstruction: finalSystemInstruction }, history });
    const result = await chat.sendMessage({ message: userMessage.text });

    // 5. Finalize Job
    jobData.status = 'COMPLETED';
    jobData.statusMessage = 'Selesai';
    jobData.result = result.text;
    jobData.updatedAt = Date.now();
    await kv.set(jobKey, jobData, { ex: 3600 });

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
    // Update the job with the failure status
    const jobData: any = await kv.get(`job:${jobId}`) || {};
    jobData.status = 'FAILED';
    jobData.error = errorMessage;
    jobData.updatedAt = Date.now();
    await kv.set(`job:${jobId}`, jobData, { ex: 3600 });
  }
}


// --- MAIN HANDLER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security check: Only allow this function to be called by our internal trigger.
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret || req.headers['x-internal-api-secret'] !== internalSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jobId } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  // Acknowledge the request immediately so the trigger doesn't time out.
  res.status(200).json({ message: `Processing job ${jobId}` });

  // Asynchronously process the job. We don't wait for the response.
  processJob(jobId);
}
