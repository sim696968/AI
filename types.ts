export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata[];
}

export interface GroundingMetadata {
  url: string;
  title: string;
}

export enum Persona {
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  TECHNICAL = 'technical',
  CREATIVE = 'creative'
}

export interface AppSettings {
  persona: Persona;
  enableSearch: boolean;
  userName: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}