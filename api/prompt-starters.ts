// Creator: A. Indra Malik - SMAN11MKS
import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Papa from "papaparse";

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

async function getSchoolDataSchema(): Promise<Record<string, string[]>> {
    const now = Date.now();
    if (!schoolDataCache || (now - schoolDataCache.timestamp > CACHE_DURATION_MS)) {
        console.log("Cache is stale or empty for schema. Fetching new school data...");
        const sheetUrlsString = process.env.GOOGLE_SHEET_CSV_URLS || '';
        const sheetUrls = sheetUrlsString.split(',').map(url => url.trim()).filter(Boolean);
        if (sheetUrls.length === 0) {
            throw new Error("GOOGLE_SHEET_CSV_URLS environment variable is not configured or empty.");
        }
        
        const sheetNames = ["SISWA", "GURU", "PEGAWAI", "PEMBELAJARAN", "ROMBEL", "PTK", "PELANGGARAN", "PRESENSI_SHALAT", "PROFIL_SEKOLAH"];
        const promises = sheetUrls.map(url => fetch(url).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
            return res.text();
        }));
        
        const csvDataArray = await Promise.all(promises);
        
        const fetchedSchoolData: Record<string, string> = {};
        csvDataArray.forEach((csv, index) => {
            const name = sheetNames[index] || `DATA_${index + 1}`;
            fetchedSchoolData[name] = csv;
        });

        schoolDataCache = {
            data: fetchedSchoolData,
            timestamp: now
        };
    } else {
        console.log("Using cached school data for schema.");
    }

    const schema: Record<string, string[]> = {};
    for (const [name, csvData] of Object.entries(schoolDataCache.data)) {
        if (csvData) {
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true, preview: 1 });
            schema[name] = parsed.meta.fields || [];
        }
    }
    return schema;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const schema = await getSchoolDataSchema();
        const schemaString = JSON.stringify(schema, null, 2);

        const prompt = `
Anda adalah AI yang bertugas membuat contoh pertanyaan untuk "Asisten Guru AI".
Berdasarkan skema data CSV berikut, buatlah 4 contoh pertanyaan yang beragam, relevan, dan bermanfaat yang mungkin ditanyakan oleh seorang guru.
Pastikan pertanyaan tersebut praktis dan dapat dijawab langsung dari kolom data yang tersedia.
Hindari pertanyaan yang terlalu umum atau terlalu spesifik yang mungkin tidak ada datanya.
Fokus pada pertanyaan tentang siswa, kelas, pelanggaran, dan data guru.

Skema Data:
${schemaString}

KEMBALIKAN HANYA dalam format JSON dengan struktur: { "questions": ["pertanyaan 1", "pertanyaan 2", "pertanyaan 3", "pertanyaan 4"] }
`;

        const response = await performAiActionWithRetry(ai => 
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
