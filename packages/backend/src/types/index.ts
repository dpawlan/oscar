import { Credentials } from 'google-auth-library';

export interface TokenData extends Credentials {
  email?: string;
}

export interface ChatMessage {
  type: 'text' | 'tool_use' | 'partial' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  name?: string;
  input?: unknown;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  cost?: number;
  message?: string;
}

export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface FullEmail extends EmailSummary {
  threadId: string;
  to: string;
  body: string;
  labels: string[];
}

export interface Label {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}
