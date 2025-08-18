
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

type Status = 'connected' | 'error' | 'unconfigured' | 'checking';

interface StatusDetail {
  status: Status;
  message: string;
}

interface StatusResponse {
  sheets: StatusDetail;
  gemini: StatusDetail;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const response: StatusResponse = {
    sheets: { status: 'unconfigured', message: 'Variabel GOOGLE_SHEET_CSV_URLS belum diatur.' },
    gemini: { status: 'unconfigured', message: 'Variabel GEMINI_API_KEYS belum diatur.' },
  };

  const apiKeysString = process.env.GEMINI_API_KEYS || '';
  const apiKeys = apiKeysString.split(',').map(k => k.trim()).filter(Boolean);
  
  const sheetUrlsString = process.env.GOOGLE_SHEET_CSV_URLS || '';
  const sheetUrls = sheetUrlsString.split(',').map(url => url.trim()).filter(Boolean);

  // Check Google Sheet URL (hanya periksa URL pertama untuk kecepatan)
  if (sheetUrls.length > 0) {
    const firstUrl = sheetUrls[0];
    try {
      const fetchResponse = await fetch(firstUrl);
      if (fetchResponse.ok) {
        response.sheets = { status: 'connected', message: 'Koneksi ke Google Sheets berhasil.' };
      } else {
        response.sheets = { status: 'error', message: `Gagal terhubung ke URL pertama (Status: ${fetchResponse.status}). Periksa URL dan pastikan Web App di-deploy.` };
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Unknown error';
      response.sheets = { status: 'error', message: `Gagal menghubungi URL Google Sheets pertama. Error: ${err}` };
    }
  } else {
    response.sheets = { status: 'unconfigured', message: 'URL Google Sheets belum dikonfigurasi.' };
  }

  // Check Gemini API Key (hanya periksa kunci pertama untuk kecepatan)
  if (apiKeys.length > 0) {
    const firstApiKey = apiKeys[0];
    try {
      const ai = new GoogleGenAI({ apiKey: firstApiKey });
      // Gunakan panggilan yang ringan seperti countTokens untuk validasi
      await ai.models.countTokens({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: "hello" }] }
      });
      response.gemini = { status: 'connected', message: 'Koneksi ke Gemini API berhasil.' };
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Unknown error';
      response.gemini = { status: 'error', message: `Kunci API Gemini pertama tidak valid atau ada masalah jaringan. Error: ${err.substring(0, 150)}...` };
    }
  } else {
     response.gemini = { status: 'unconfigured', message: 'Kunci API Gemini belum dikonfigurasi.' };
  }

  return res.status(200).json(response);
}
