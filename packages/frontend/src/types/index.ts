export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolUse?: {
    name: string;
    status: 'pending' | 'success' | 'error';
  };
}

export interface ChatStreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  name?: string;
  success?: boolean;
  message?: string;
  code?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
}
