// Creator: A. Indra Malik - SMAN11MKS
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Papa from "papaparse";

// --- START: Data Source Parsing Logic ---
/**
 * Parses ORGANIZATION_DATA_SOURCES and SHEET_NAMES environment variables.
 * It pairs the URLs from the first variable with names from the second variable
 * based on their order.
 * @returns An array of objects, each with a 'name' and 'url'.
 */
function getPairedDataSources(): { name: string; url: string }[] {
    const urlsString = process.env.ORGANIZATION_DATA_SOURCES || '';
    const namesString = process.env.SHEET_NAMES || '';

    const urls = urlsString.split(',').map(url => url.trim()).filter(Boolean);
    const names = namesString.split(',').map(name => name.trim().toUpperCase()).filter(Boolean);

    if (urls.length === 0) {
        return [];
    }

    return urls.map((url, index) => ({
        // Use the name from SHEET_NAMES if available, otherwise generate a default name.
        name: names[index] || `DATA_${index + 1}`,
        url: url
    }));
}
// --- END: Data Source Parsing Logic ---


// --- START: Caching Implementation ---
interface SchoolDataCache {
  data: Record<string, string>;
  timestamp: number;
}
let schoolDataCache: SchoolDataCache | null = null;
const CACHE_DURATION_MS = 10 * 60 * 1000; // Cache valid for 10 minutes
// --- END: Caching Implementation ---

// Rotates through available API keys. State is maintained between invocations.
let keyIndex = 0;
async function performAiActionWithRetry<T>(action: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    const apiKeysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) {
      throw new Error("GEMINI_API_KEYS environment variable is not configured or empty on Vercel.");
    }
    const initialKeyIndex = keyIndex;
    let lastError: any = new Error("No API keys were available or tried.");
    for (let i = 0; i < apiKeys.length; i++) {
        const currentKeyIndex = (initialKeyIndex + i) % apiKeys.length;
        const apiKey = apiKeys[currentKeyIndex];
        try {
            console.log(`Attempting AI action with key index: ${currentKeyIndex}`);
            const ai = new GoogleGenAI({ apiKey });
            const result = await action(ai);
            keyIndex = (currentKeyIndex + 1) % apiKeys.length;
            return result;
        } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
            if (isRateLimitError) {
                console.log(`Key index ${currentKeyIndex} is rate-limited. Trying next key...`);
            } else {
                console.error(`Non-retriable error with key index ${currentKeyIndex}. Failing fast.`, error);
                keyIndex = (currentKeyIndex + 1) % apiKeys.length;
                throw error;
            }
        }
    }
    console.warn("All available API keys are currently rate-limited.");
    throw new Error("Semua koneksi API sedang sibuk karena batas penggunaan telah tercapai. Silakan coba lagi dalam satu menit.");
}

/**
 * Helper function to get a random subset of an array.
 * @param arr The array to sample from.
 * @param count The number of samples to return.
 * @returns An array containing a random subset of the original array.
 */
function getRandomSamples<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) {
    return arr;
  }
  // Create a shuffled copy of the array and take the first 'count' elements.
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Fetches school data (from cache or network) and extracts the schema (headers) and
 * a few random sample rows to provide better context to the AI.
 * @returns A record mapping sheet names to their schema and sample data.
 */
async function getSchoolDataContext(): Promise<Record<string, { headers: string[]; samples: any[] }>> {
    const now = Date.now();
    if (!schoolDataCache || (now - schoolDataCache.timestamp > CACHE_DURATION_MS)) {
        console.log("Cache is stale or empty for context. Fetching new school data...");
        const sources = getPairedDataSources();

        if (sources.length === 0) {
            throw new Error("ORGANIZATION_DATA_SOURCES environment variable is not configured or empty.");
        }
        
        const promises = sources.map(source => fetch(source.url).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch ${source.url}: ${res.statusText}`);
            return res.text();
        }));
        
        const csvDataArray = await Promise.all(promises);
        
        const fetchedSchoolData: Record<string, string> = {};
        csvDataArray.forEach((csv, index) => {
            const source = sources[index];
            fetchedSchoolData[source.name] = csv;
        });

        schoolDataCache = {
            data: fetchedSchoolData,
            timestamp: now
        };
    } else {
        console.log("Using cached school data for context.");
    }

    const context: Record<string, { headers: string[]; samples: any[] }> = {};
    for (const [name, csvData] of Object.entries(schoolDataCache.data)) {
        if (csvData) {
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
            if (parsed.data.length > 0 && parsed.meta.fields) {
                const samples = getRandomSamples(parsed.data, 3);
                context[name] = {
                    headers: parsed.meta.fields,
                    samples: samples
                };
            }
        }
    }
    return context;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const dataContext = await getSchoolDataContext();
        const dataContextString = JSON.stringify(dataContext, null, 2);

        const prompt = `
Anda adalah AI yang bertugas membuat contoh pertanyaan untuk "Asisten Guru AI".
Berdasarkan skema data (headers) DAN beberapa baris contoh data acak (samples) berikut, buatlah 4 contoh pertanyaan yang beragam, relevan, dan bermanfaat yang mungkin ditanyakan oleh seorang guru.
PENTING: Gunakan nilai-nilai yang ada di dalam 'samples' untuk membuat pertanyaan Anda lebih akurat. Misalnya, jika Anda melihat nama kelas "X 1" di sampel, gunakan nama kelas itu dalam pertanyaan Anda, jangan mengarang nama kelas seperti "10A".

Konteks Data (Skema dan Sampel):
${dataContextString}

KEMBALIKAN HANYA dalam format JSON denganstruktur: { "questions": ["pertanyaan 1", "pertanyaan 2", "pertanyaan 3", "pertanyaan 4"] }
`;

        const response = await performAiActionWithRetry<GenerateContentResponse>(ai => 
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            questions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING
                                }
                            }
                        }
                    }
                }
            })
        );
        
        // Attempt to parse the response, as Gemini might still wrap it in markdown
        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        }
        
        const result = JSON.parse(jsonText);
        return res.status(200).json(result);

    } catch (error) {
        console.error("Error generating prompt starters:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return res.status(500).json({ error: errorMessage, questions: [] });
    }
}