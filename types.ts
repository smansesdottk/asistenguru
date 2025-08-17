export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export interface ChatMessage {
  role: MessageRole;
  text: string;
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
}
