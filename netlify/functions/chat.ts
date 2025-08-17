// Creator: A. Indra Malik - SMAN11MKS
import { GoogleGenAI } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { verifySessionToken } from "../util/auth";

// Self-contained types to avoid path issues in deployment
enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

interface ChatMessage {
  role: MessageRole;
  text: string;
}

// State untuk rotasi kunci API, dipertahankan antar pemanggilan fungsi (selama instance 'hot')
let keyIndex = 0;

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  
  try {
    // 1. Verifikasi Sesi Pengguna
    const user = await verifySessionToken(event.headers.cookie);
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!event.body) {
      throw new Error('Request body is missing.');
    }

    const { messages } = JSON.parse(event.body);
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid request body: "messages" array is required.');
    }

    // Baca dan proses multiple API keys
    const apiKeysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) {
      throw new Error("GEMINI_API_KEYS environment variable is not configured or empty on Netlify.");
    }
    
    // Baca dan proses multiple Google Sheet URLs
    const sheetUrlsString = process.env.GOOGLE_SHEET_CSV_URLS || '';
    const sheetUrls = sheetUrlsString.split(',').map(url => url.trim()).filter(Boolean);
    if (sheetUrls.length === 0) {
        throw new Error("GOOGLE_SHEET_CSV_URLS environment variable is not configured or empty on Netlify.");
    }

    // Rotasi kunci API
    const apiKey = apiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % apiKeys.length;

    const ai = new GoogleGenAI({ apiKey });

    // Ambil semua data sekolah dari berbagai sheet secara bersamaan
    const sheetNames = ["SISWA", "GURU", "PEGAWAI", "PEMBELAJARAN", "ROMBEL", "PTK", "PELANGGARAN", "PRESENSI_SHALAT", "PROFIL_SEKOLAH"];
    const promises = sheetUrls.map(url => fetch(url).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        return res.text();
    }));
    
    const csvDataArray = await Promise.all(promises);
    
    const schoolData: Record<string, string> = {};
    csvDataArray.forEach((csv, index) => {
        const name = sheetNames[index] || `DATA_${index + 1}`;
        schoolData[name] = csv;
    });

    const schoolDataJson = JSON.stringify(schoolData, null, 2);

    const systemInstruction = `
Anda adalah "Asisten Guru AI" untuk sekolah yang informasinya ada di environment variable.
Tugas Anda adalah untuk membantu para guru dengan menjawab pertanyaan mereka terkait data sekolah.
Gunakan HANYA data dalam format CSV yang disediakan di bawah ini untuk menjawab pertanyaan. Data ini diambil langsung dari beberapa Google Spreadsheet sekolah.
Setiap kunci dalam objek JSON berikut mewakili nama sheet (misalnya, "SISWA", "GURU") dan nilainya adalah konten sheet tersebut dalam format CSV.
Jawablah dengan ramah, jelas, dan profesional dalam Bahasa Indonesia.
Jika pertanyaan di luar konteks data yang diberikan, atau jika Anda tidak dapat menemukan jawabannya dalam data, katakan dengan sopan bahwa Anda tidak memiliki informasi tersebut.
Jangan mengarang informasi.

Berikut adalah data sekolah yang Anda miliki:
${schoolDataJson}
`;

    const userMessage = messages[messages.length - 1];
    const history = messages
      .slice(0, -1)
      .filter((m: ChatMessage) => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map((msg: ChatMessage) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction },
      history: history,
    });
    
    const result = await chat.sendMessage({ message: userMessage.text });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result.text }),
    };

  } catch (error) {
    console.error("Error in chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };