// Creator: A. Indra Malik - SMAN11MKS
import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from "jose";
import Papa from "papaparse";

// --- START: Self-contained Auth Logic ---
const SESSION_COOKIE_NAME = 'app_session';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

async function verifySessionToken(token: string): Promise<UserProfile | null> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET is not available. Cannot verify session token.');
    return null;
  }
  const secretKey = new TextEncoder().encode(jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserProfile;
  } catch (error) {
    console.log('Token verification failed:', error);
    return null;
  }
}

function getSessionCookie(cookieHeader: string | undefined | null): string | undefined {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
    return sessionCookie ? sessionCookie.split('=')[1] : undefined;
}
// --- END: Self-contained Auth Logic ---

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

// Self-contained types to avoid path issues in deployment
enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

interface ChatMessage {
  role: MessageRole;
  text: string;
}

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

/**
 * A wrapper function to perform a Gemini API action with automatic key rotation and retry logic for rate limits.
 * @param action A function that takes a GoogleGenAI client instance and returns a Promise with the result of the API call.
 * @returns The result of the successful API call.
 * @throws Throws an error if a non-retriable error occurs, or a user-friendly error if all keys are rate-limited.
 */
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
            
            // Success! Update the global keyIndex for the next request to start with the next key.
            keyIndex = (currentKeyIndex + 1) % apiKeys.length;
            return result;

        } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
            // Check for common rate limit error signatures from the Gemini API.
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');

            if (isRateLimitError) {
                console.log(`Key index ${currentKeyIndex} is rate-limited. Trying next key...`);
                // Continue to the next key in the loop.
            } else {
                // It's a different, non-retriable error (e.g., invalid key, server error), so we should fail fast.
                console.error(`Non-retriable error with key index ${currentKeyIndex}. Failing fast.`, error);
                // Update keyIndex so the next request doesn't re-use the potentially bad key.
                keyIndex = (currentKeyIndex + 1) % apiKeys.length;
                throw error; // Rethrow the original error.
            }
        }
    }

    // If the loop completes, it means all keys were rate-limited.
    console.warn("All available API keys are currently rate-limited.");
    throw new Error("Semua koneksi API sedang sibuk karena batas penggunaan telah tercapai. Silakan coba lagi dalam satu menit.");
}

/**
 * Extracts the schema (headers) and a few random sample rows from raw CSV data
 * to provide context to the AI for retrieval tasks.
 * @param schoolData A record mapping sheet names to their raw CSV content.
 * @returns A record mapping sheet names to their schema and sample data.
 */
function getSchoolDataContext(schoolData: Record<string, string>): Record<string, { headers: string[]; samples: any[] }> {
    const getRandomSamples = <T>(arr: T[], count: number): T[] => {
        if (arr.length <= count) return arr;
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    const context: Record<string, { headers: string[]; samples: any[] }> = {};
    for (const [name, csvData] of Object.entries(schoolData)) {
        if (csvData) {
            const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
            if (parsed.data.length > 0 && parsed.meta.fields) {
                const samples = getRandomSamples(parsed.data, 2); // Get 2 samples
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = getSessionCookie(req.headers.cookie);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No session token found.' });
    }
    const user = await verifySessionToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid session token.' });
    }

    if (!req.body) {
      throw new Error('Request body is missing.');
    }

    const { messages, model } = req.body;
    const modelToUse = model || 'gemini-2.5-flash'; // Default to 2.5 flash
    const userMessage = messages[messages.length - 1];
    
    if (!messages || !Array.isArray(messages) || messages.length === 0 || !userMessage) {
      throw new Error('Invalid request body: "messages" array is required.');
    }
    
    // Fetch data from cache or source
    const now = Date.now();
    if (!schoolDataCache || (now - schoolDataCache.timestamp > CACHE_DURATION_MS)) {
      console.log("Cache is stale or empty. Fetching new school data...");
      const sources = getPairedDataSources();
      
      if (sources.length === 0) {
          throw new Error("ORGANIZATION_DATA_SOURCES environment variable is not configured or empty on Vercel.");
      }
      
      const promises = sources.map(source => fetch(source.url).then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${source.url}: ${res.statusText}`);
          return res.text();
      }));
      
      const csvDataArray = await Promise.all(promises);
      
      const fetchedSchoolData: Record<string, string> = {};
      csvDataArray.forEach((csv, index) => {
          const source = sources[index];
          // Use the name from the parsed source object
          fetchedSchoolData[source.name] = csv;
      });

      schoolDataCache = {
        data: fetchedSchoolData,
        timestamp: now
      };

    } else {
        console.log("Using cached school data.");
    }

    // --- START: New AI-Powered RAG (Retrieval-Augmented Generation) Flow ---
    
    // Step 1: Retrieval - Ask the AI what data is needed to answer the question.
    const dataContext = getSchoolDataContext(schoolDataCache.data);
    const dataContextString = JSON.stringify(dataContext, null, 2);

    const retrievalSchema = {
      type: Type.OBJECT,
      properties: {
        searches: {
          type: Type.ARRAY,
          description: "List of sheets and filters to apply.",
          items: {
            type: Type.OBJECT,
            properties: {
              sheetName: { type: Type.STRING, description: "The exact name of the sheet to search in, e.g., 'SISWA'." },
              filters: {
                type: Type.ARRAY,
                description: "List of filters. If empty, return the whole sheet. Use 'contains' logic for values.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    column: { type: Type.STRING, description: "The column header to filter on, e.g., 'Nama'." },
                    value: { type: Type.STRING, description: "The value to look for in the column, e.g., 'Budi'." }
                  }
                }
              }
            }
          }
        }
      }
    };

    const retrievalPrompt = `You are a data retrieval expert. Your task is to analyze a user's question and a list of available data sheets (with their columns and sample data) and determine exactly which sheets and filters are needed to answer the question.

User Question: "${userMessage.text}"

Available Data Sheets (Name, Columns, and Samples):
${dataContextString}

Based on the user's question, identify the necessary data.
- If a sheet is relevant but you don't need to filter its rows, provide an empty "filters" array for it.
- Your filters should be broad 'contains' searches, not exact matches.
- Only include sheets that are absolutely necessary to answer the question. If no sheets are relevant, return an empty "searches" array.
- The sheetName must be one of the exact names provided in the context.`;

    console.log("Performing retrieval step...");
    const retrievalResponse = await performAiActionWithRetry(ai =>
      ai.models.generateContent({
        model: modelToUse,
        contents: retrievalPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: retrievalSchema,
        },
      })
    );
    const retrievalResult = JSON.parse(retrievalResponse.text ?? '{"searches":[]}');
    const searches = retrievalResult.searches || [];

    // Step 2: Filtering - Apply the filters determined by the AI.
    const focusedData: Record<string, string> = {};
    if (searches.length > 0) {
      console.log("AI retrieval plan:", JSON.stringify(searches));
      for (const search of searches) {
        const sheetName = search.sheetName.toUpperCase();
        const filters = search.filters || [];
        const csvData = schoolDataCache.data[sheetName];
        if (!csvData) {
            console.warn(`AI requested non-existent sheet: ${sheetName}`);
            continue;
        }

        if (filters.length === 0) {
          focusedData[sheetName] = csvData; // Include the whole sheet
        } else {
          const parsedData = Papa.parse(csvData, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data as any[];
          let filteredRows = parsedData;

          for (const filter of filters) {
            if (filter.column && filter.value) {
                filteredRows = filteredRows.filter(row =>
                  row[filter.column] &&
                  String(row[filter.column]).toLowerCase().includes(String(filter.value).toLowerCase())
                );
            }
          }

          if (filteredRows.length > 0) {
            focusedData[sheetName] = Papa.unparse(filteredRows);
          }
        }
      }
    } else {
        console.log("AI retrieval returned no relevant sheets.");
    }
    
    // Step 3: Generation - Ask the AI to answer the question using ONLY the filtered data.
    let finalSchoolData: string;
    let finalSystemInstruction: string;

    if (Object.keys(focusedData).length === 0 && searches.length > 0) {
        // This case means the AI wanted to filter, but the filters returned no results.
        console.log("After filtering, no data was found. The information likely does not exist.");
        finalSystemInstruction = `Anda adalah "Asisten Guru AI". Jawab pertanyaan pengguna: "${userMessage.text}". Berdasarkan analisis, data yang Anda minta tidak ditemukan dalam catatan kami. Sampaikan dengan sopan bahwa informasi tersebut tidak tersedia atau mungkin keliru, dan sarankan untuk mencoba pertanyaan lain.`;
        finalSchoolData = "{}"; // No data
    } else if (Object.keys(focusedData).length === 0 && searches.length === 0) {
        // This case means the AI determined from the start that no sheets were relevant.
        console.log("AI determined no sheets are relevant. The query is likely out of context.");
        finalSystemInstruction = `Anda adalah "Asisten Guru AI". Jawab pertanyaan pengguna: "${userMessage.text}". Sampaikan dengan sopan bahwa pertanyaan tersebut di luar lingkup data yang Anda miliki (seperti data siswa, guru, jadwal, dll.) dan Anda tidak dapat menjawabnya.`;
        finalSchoolData = "{}"; // No data
    } else {
        console.log(`Data successfully filtered for sheets: ${Object.keys(focusedData).join(', ')}`);
        finalSystemInstruction = `Anda adalah "Asisten Guru AI". Gunakan HANYA data JSON yang sudah difilter di bawah ini untuk menjawab pertanyaan pengguna. Kunci JSON mewakili nama data (misal "SISWA") dan nilainya adalah string CSV. Jangan mengacu pada data lain. Sajikan jawaban Anda dalam format yang jelas, dan jika diminta, buatlah tabel.`;
        finalSchoolData = JSON.stringify(focusedData, null, 2);
    }
    
    const systemInstructionWithViz = `${finalSystemInstruction}
PENTING: Jika pengguna meminta visualisasi data (seperti grafik, diagram, perbandingan, rekapitulasi, atau distribusi), Anda HARUS menyertakan **satu atau lebih blok data grafik** dalam format JSON di dalam respons teks Anda.
Misalnya, jika diminta "grafik batang dan lingkaran", Anda harus membuat KEDUA-DUAnya.
- Gunakan tipe grafik 'pie' untuk proporsi (seperti persentase gender).
- Gunakan tipe grafik 'bar' untuk perbandingan antar kategori (seperti jumlah siswa per kelas).
Struktur JSON untuk setiap grafik adalah: \`{"type":"pie|bar","title":"Judul Grafik","data":{"labels":[...],"datasets":[{"label":"...","data":[...],"backgroundColor":["#hex",...]}]}}\`
Setiap blok JSON HARUS dibungkus dengan tag [CHART_DATA] dan [/CHART_DATA].
Contoh respons untuk dua grafik: "Tentu, ini grafiknya: [CHART_DATA]{...pie chart JSON...}[/CHART_DATA] dan ini grafik lainnya [CHART_DATA]{...bar chart JSON...}[/CHART_DATA] Teks penjelasan tambahan."
Jika tidak ada permintaan visualisasi, jawablah seperti biasa tanpa tag atau JSON.`;

    const finalPrompt = `${systemInstructionWithViz}\n\nBerikut adalah data yang Anda miliki:\n${finalSchoolData}`;
    
    const history = messages
      .slice(0, -1)
      .filter((m: ChatMessage) => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    const resultStream = await performAiActionWithRetry(async (ai) => {
        const chat = ai.chats.create({
          model: modelToUse,
          config: { systemInstruction: finalPrompt },
          history: history,
        });
        return chat.sendMessageStream({ message: userMessage.text });
    });
    
    for await (const chunk of resultStream) {
      if(chunk.text) {
        res.write(chunk.text);
      }
    }
    
    res.end();

  } catch (error) {
    console.error("Error in chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // If headers are not sent, send a proper error response.
    // Otherwise, we can't do much as the stream has started.
    if (!res.headersSent) {
      return res.status(500).json({ error: errorMessage });
    } else {
      // If stream has started, try to write the error to the stream before ending.
      // This might not always be visible to the client depending on how it's handled.
      res.write(`\n\n--- ERROR ---\n${errorMessage}`);
      res.end();
    }
  }
}