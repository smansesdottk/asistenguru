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

let keyIndex = 0;

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

    const { messages } = req.body;
    const userMessage = messages[messages.length - 1];
    if (!messages || !Array.isArray(messages) || messages.length === 0 || !userMessage) {
      throw new Error('Invalid request body: "messages" array is required.');
    }

    const apiKeysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) {
      throw new Error("GEMINI_API_KEYS environment variable is not configured or empty on Vercel.");
    }
    
    // Fetch data from cache or source
    const now = Date.now();
    if (!schoolDataCache || (now - schoolDataCache.timestamp > CACHE_DURATION_MS)) {
      console.log("Cache is stale or empty. Fetching new school data...");
      const sheetUrlsString = process.env.GOOGLE_SHEET_CSV_URLS || '';
      const sheetUrls = sheetUrlsString.split(',').map(url => url.trim()).filter(Boolean);
      if (sheetUrls.length === 0) {
          throw new Error("GOOGLE_SHEET_CSV_URLS environment variable is not configured or empty on Vercel.");
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
        console.log("Using cached school data.");
    }

    // Rotate API key
    const apiKey = apiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % apiKeys.length;
    const ai = new GoogleGenAI({ apiKey });

    // --- START: Smart Two-Step AI Flow ---
    let finalSystemInstruction: string;
    let finalSchoolData: string;

    try {
      // Step 1: Intent Extraction - Find the class name
      const intentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      });

      const intentResult = JSON.parse(intentResponse.text ?? '{}');
      const targetClassName = intentResult?.className;
      
      if (targetClassName && schoolDataCache.data.SISWA) {
        const normalizedTargetClassName = normalizeClassName(targetClassName);
        console.log(`Class name detected: "${targetClassName}". Normalized to: "${normalizedTargetClassName}". Filtering data...`);
        
        // Step 2: Code-based Filtering based on the user's explicit schema
        const studentsCsv = schoolDataCache.data.SISWA;
        const students = Papa.parse(studentsCsv, { header: true, skipEmptyLines: true }).data as any[];

        // 1. Filter Students by "Rombel Saat Ini" using normalization
        const filteredStudents = students.filter(s => normalizeClassName(s['Rombel Saat Ini']) === normalizedTargetClassName);

        if (filteredStudents.length > 0) {
            console.log(`Found ${filteredStudents.length} students in class "${targetClassName}". Filtering related data...`);
            
            const studentNISNs = new Set(filteredStudents.map(s => s.NISN).filter(Boolean));
            const studentNames = new Set(filteredStudents.map(s => s.Nama).filter(Boolean));

            const focusedData: Record<string, string> = {
                SISWA: Papa.unparse(filteredStudents),
            };

            // 2. Filter PRESENSI_SHALAT by NISN
            if (schoolDataCache.data.PRESENSI_SHALAT && studentNISNs.size > 0) {
                const presensi = Papa.parse(schoolDataCache.data.PRESENSI_SHALAT, { header: true, skipEmptyLines: true }).data as any[];
                const filteredPresensi = presensi.filter(p => studentNISNs.has(p.NISN));
                if(filteredPresensi.length > 0) focusedData['PRESENSI_SHALAT'] = Papa.unparse(filteredPresensi);
            }

            // 3. Filter PELANGGARAN by KELAS and NAMA
            if (schoolDataCache.data.PELANGGARAN && studentNames.size > 0) {
                 const pelanggaran = Papa.parse(schoolDataCache.data.PELANGGARAN, { header: true, skipEmptyLines: true }).data as any[];
                 const filteredPelanggaran = pelanggaran.filter(p => 
                    normalizeClassName(p.KELAS) === normalizedTargetClassName && studentNames.has(p.NAMA)
                 );
                 if(filteredPelanggaran.length > 0) focusedData['PELANGGARAN'] = Papa.unparse(filteredPelanggaran);
            }

            // 4. Filter PEMBELAJARAN by "Nama Rombel"
            if (schoolDataCache.data.PEMBELAJARAN) {
                const pembelajaran = Papa.parse(schoolDataCache.data.PEMBELAJARAN, { header: true, skipEmptyLines: true }).data as any[];
                const filteredPembelajaran = pembelajaran.filter(p => normalizeClassName(p['Nama Rombel']) === normalizedTargetClassName);
                if(filteredPembelajaran.length > 0) focusedData['PEMBELAJARAN'] = Papa.unparse(filteredPembelajaran);
            }

            // Step 3: Focused Final Call
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
Anda adalah "Asisten Guru AI" untuk sekolah yang informasinya ada di environment variable.
Tugas Anda adalah untuk membantu para guru dengan menjawab pertanyaan mereka terkait data sekolah.
Gunakan HANYA data dalam format CSV yang disediakan di bawah ini untuk menjawab pertanyaan. Data ini diambil langsung dari beberapa Google Spreadsheet sekolah.
Setiap kunci dalam objek JSON berikut mewakili nama sheet (misalnya, "SISWA", "GURU") dan nilainya adalah konten sheet tersebut dalam format CSV.
Jawablah dengan ramah, jelas, dan profesional dalam Bahasa Indonesia.
Jika pertanyaan di luar konteks data yang diberikan, atau jika Anda tidak dapat menemukan jawabannya dalam data, katakan dengan sopan bahwa Anda tidak memiliki informasi tersebut.
Jangan mengarang informasi.`;
        finalSchoolData = JSON.stringify(schoolDataCache.data, null, 2);
    }
    // --- END: Smart Two-Step AI Flow ---

    const finalPrompt = `${finalSystemInstruction}\n\nBerikut adalah data yang Anda miliki:\n${finalSchoolData}`;

    const history = messages
      .slice(0, -1)
      .filter((m: ChatMessage) => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: finalPrompt },
      history: history,
    });
    
    const result = await chat.sendMessage({ message: userMessage.text });
    
    return res.status(200).json({ text: result.text });

  } catch (error) {
    console.error("Error in chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}