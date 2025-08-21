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

// --- START: Relationship Parsing Logic (NEW NAME-BASED FORMAT) ---
interface SheetLink {
    sheetName: string;
    columnName: string;
}

/**
 * Parses the SHEET_RELATIONSHIPS environment variable string using the new format.
 * Example input: "SISWA.NISN=PRESENSI SHALAT.NISN, SISWA.Nama=PELANGGARAN.Nama"
 * @param relationships The relationship string from environment variables.
 * @returns An array of relationship groups, where each group is an array of SheetLinks.
 */
function parseSheetRelationships(relationships: string | undefined): SheetLink[][] {
    if (!relationships) return [];
    try {
        return relationships.split(',')
            .map(group => group.trim().split('=')
                .map(part => {
                    const parts = part.trim().split('.');
                    if (parts.length < 2) return null; // Must have at least Sheet.Column
                    const sheetName = parts[0].trim().toUpperCase();
                    const columnName = parts.slice(1).join('.').trim(); // Handle column names with dots
                    return { sheetName, columnName };
                }).filter(Boolean) as SheetLink[]
            ).filter(group => group.length > 1);
    } catch (error) {
        console.error("Error parsing SHEET_RELATIONSHIPS. Please check format.", error);
        return [];
    }
}
// --- END: Relationship Parsing Logic ---

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
 * Normalizes a class name string to a standard format for reliable comparison.
 * Handles variations like "X1", "X-1", "10 1", etc., and converts them to "X 1".
 * @param name The class name string to normalize.
 * @returns A standardized class name string.
 */
function normalizeClassName(name: string | null | undefined): string {
  if (!name) return '';
  
  let normalized = name.trim().toUpperCase();

  // Replace numeric representations of grades with Roman numerals
  // Use word boundaries (\b) to avoid replacing '10' in '100'
  normalized = normalized.replace(/\b12\b/g, 'XII');
  normalized = normalized.replace(/\b11\b/g, 'XI');
  normalized = normalized.replace(/\b10\b/g, 'X');
  
  // Replace common separators (dot, hyphen) with a space
  normalized = normalized.replace(/[.-]/g, ' ');
  
  // Ensure a space between a Roman numeral grade and the class number (e.g., "X1" -> "X 1")
  normalized = normalized.replace(/(XII|XI|X)(\d)/g, '$1 $2');
  
  // Collapse multiple spaces into a single space
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
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

    // --- START: Smart Two-Step AI Flow ---
    let finalSystemInstruction: string;
    let finalSchoolData: string;

    try {
      // Step 1: Intent Extraction - Find the class name
      const intentResponse = await performAiActionWithRetry(async (ai) =>
        ai.models.generateContent({
          model: modelToUse,
          contents: `Analyze the user's message to see if they are asking for student data from a specific class (Rombel). If they are, extract the exact class name. If they are not asking about a specific class, return null for the className. User message: "${userMessage.text}"`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                className: {
                  type: Type.STRING,
                  description: 'The specific class name mentioned by the user, for example "X 1" or "XI 6".',
                  nullable: true,
                },
              },
            },
          },
        })
      );

      const intentResult = JSON.parse(intentResponse.text ?? '{}');
      const targetClassName = intentResult?.className;
      
      const siswaSheetName = "SISWA";
      if (targetClassName && schoolDataCache.data[siswaSheetName]) {
        const normalizedTargetClassName = normalizeClassName(targetClassName);
        console.log(`Class name detected: "${targetClassName}". Normalized to: "${normalizedTargetClassName}". Filtering data...`);
        
        const studentsCsv = schoolDataCache.data[siswaSheetName];
        const students = Papa.parse(studentsCsv, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data as any[];
        const filteredStudents = students.filter(s => normalizeClassName(s['Rombel Saat Ini']) === normalizedTargetClassName);

        if (filteredStudents.length > 0) {
            console.log(`Found ${filteredStudents.length} students in class "${targetClassName}". Filtering related data...`);
            
            const focusedData: Record<string, string> = { [siswaSheetName]: Papa.unparse(filteredStudents) };
            const relationships = process.env.SHEET_RELATIONSHIPS;

            if (relationships) {
                // --- NEW: Explicit Relationship Filtering (Name-based) ---
                console.log("Using explicit SHEET_RELATIONSHIPS for advanced filtering.");
                const parsedRelations = parseSheetRelationships(relationships);
                const allSheetData: Record<string, any[]> = {};

                // Parse all sheets once for efficiency
                for (const name in schoolDataCache.data) {
                    allSheetData[name] = Papa.parse(schoolDataCache.data[name], { header: true, skipEmptyLines: true, transformHeader: h => h.trim() }).data;
                }

                for (const group of parsedRelations) {
                    const primaryLink = group.find(link => link.sheetName === siswaSheetName);
                    if (!primaryLink) continue; // This group doesn't link to SISWA

                    const primaryKeys = new Set(filteredStudents.map(s => s[primaryLink.columnName]).filter(Boolean));
                    if (primaryKeys.size === 0) continue;

                    for (const relatedLink of group) {
                        if (relatedLink.sheetName === siswaSheetName) continue;
                        if (!allSheetData[relatedLink.sheetName]) continue;

                        const filteredRelatedData = allSheetData[relatedLink.sheetName].filter(row => primaryKeys.has(row[relatedLink.columnName]));
                        if (filteredRelatedData.length > 0) {
                            focusedData[relatedLink.sheetName] = Papa.unparse(filteredRelatedData);
                            console.log(`Linked and filtered ${filteredRelatedData.length} rows for sheet: ${relatedLink.sheetName}`);
                        }
                    }
                }
            } else {
                // --- FALLBACK: Implicit, Name-based Filtering ---
                console.log("No SHEET_RELATIONSHIPS defined. Using implicit name-based filtering.");
                const studentNISNs = new Set(filteredStudents.map(s => s.NISN).filter(Boolean));
                const studentNames = new Set(filteredStudents.map(s => s.Nama).filter(Boolean));

                if (schoolDataCache.data['PRESENSI SHALAT'] && studentNISNs.size > 0) {
                    const presensi = Papa.parse(schoolDataCache.data['PRESENSI SHALAT'], { header: true, skipEmptyLines: true }).data as any[];
                    const filteredPresensi = presensi.filter(p => studentNISNs.has(p.NISN));
                    if(filteredPresensi.length > 0) focusedData['PRESENSI SHALAT'] = Papa.unparse(filteredPresensi);
                }
                if (schoolDataCache.data['PELANGGARAN'] && studentNames.size > 0) {
                     const pelanggaran = Papa.parse(schoolDataCache.data['PELANGGARAN'], { header: true, skipEmptyLines: true }).data as any[];
                     const filteredPelanggaran = pelanggaran.filter(p => normalizeClassName(p.KELAS) === normalizedTargetClassName && studentNames.has(p.NAMA));
                     if(filteredPelanggaran.length > 0) focusedData['PELANGGARAN'] = Papa.unparse(filteredPelanggaran);
                }
            }
            // Filter PEMBELAJARAN (common to both methods)
            if (schoolDataCache.data['PEMBELAJARAN']) {
                const pembelajaran = Papa.parse(schoolDataCache.data['PEMBELAJARAN'], { header: true, skipEmptyLines: true }).data as any[];
                const filteredPembelajaran = pembelajaran.filter(p => normalizeClassName(p['Nama Rombel']) === normalizedTargetClassName);
                if(filteredPembelajaran.length > 0) focusedData['PEMBELAJARAN'] = Papa.unparse(filteredPembelajaran);
            }

            finalSystemInstruction = `Anda adalah "Asisten Guru AI". Pengguna bertanya tentang kelas "${targetClassName}". Anda HARUS menggunakan HANYA data JSON yang sudah difilter di bawah ini untuk menjawab. Kunci JSON mewakili nama data (misal "SISWA") dan nilainya adalah string CSV. Jangan mengacu pada data lain. Sajikan data ini dalam format yang diminta pengguna (misalnya, tabel).`;
            finalSchoolData = JSON.stringify(focusedData, null, 2);

        } else {
            // Class was mentioned but no students were found in that class in the SISWA sheet.
            console.log(`No students found for class "${targetClassName}" in SISWA sheet. Falling back to default.`);
            throw new Error("Fallback: No students found for the class.");
        }
      } else {
        // No class name detected, use the default method
        throw new Error("Fallback: No class name in user query.");
      }
    } catch (e) {
        console.log("Smart flow failed or was skipped. Using default method.", e instanceof Error ? e.message : "");
        // Default Fallback Logic
        finalSystemInstruction = `
Anda adalah "Asisten Guru AI" untuk institusi yang informasinya ada di environment variable.
Tugas Anda adalah untuk membantu para guru dengan menjawab pertanyaan mereka terkait data institusi.
Gunakan HANYA data dalam format CSV yang disediakan di bawah ini untuk menjawab pertanyaan. Data ini diambil langsung dari beberapa Google Spreadsheet.
Setiap kunci dalam objek JSON berikut mewakili nama sheet (misalnya, "SISWA", "GURU") dan nilainya adalah konten sheet tersebut dalam format CSV.
Jawablah dengan ramah, jelas, dan profesional dalam Bahasa Indonesia.
Jika pertanyaan di luar konteks data yang diberikan, atau jika Anda tidak dapat menemukan jawabannya dalam data, katakan dengan sopan bahwa Anda tidak memiliki informasi tersebut.
Jangan mengarang informasi.`;
        finalSchoolData = JSON.stringify(schoolDataCache.data, null, 2);
    }
    // --- END: Smart Two-Step AI Flow ---

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