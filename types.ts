export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export type Theme = 'light' | 'dark' | 'system';

export interface ChatMessage {
  role: MessageRole;
  text: string;
  jobId?: string; // Tautkan pesan ke pekerjaan asinkron
  jobStatus?: JobStatus; // Simpan status pekerjaan terakhir
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // ISO string date
  model?: string; // Model AI yang digunakan, misal: 'gemini-2.5-flash'
}

export interface Teacher {
  id: number;
  name: string;
  subject: string;
}

export interface Student {
  id: number;
  name: string;
  class: string;
}

export interface Grade {
  studentId: number;
  subject: string;
  score: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

export interface PublicConfig {
  schoolNameFull?: string;
  schoolNameShort?: string;
  appVersion?: string;
  googleClientId?: string;
  isGoogleLoginConfigured?: boolean;
  appBaseUrl?: string;
  googleWorkspaceDomain?: string;
}


// Tipe untuk sistem pekerjaan asinkron
export type JobState = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface JobStatus {
  status: JobState;
  statusMessage?: string; // Pesan yang ramah untuk UI, mis. "Menganalisis data..."
  result?: string; // Hasil akhir jika COMPLETED
  error?: string; // Pesan error jika FAILED
}