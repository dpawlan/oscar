import { create } from 'zustand';
import type { Message } from '../types';

interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isStreaming: boolean;
  lastEventWasTool: boolean;

  // Actions
  addMessage: (message: Message) => void;
  updateLastMessage: (update: Partial<Message>) => void;
  appendToLastMessage: (content: string) => void;
  markToolEvent: () => void;
  setSessionId: (id: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  sessionId: null,
  isStreaming: false,
  lastEventWasTool: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message], lastEventWasTool: false })),

  updateLastMessage: (update) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0) {
        messages[lastIndex] = { ...messages[lastIndex], ...update };
      }
      return { messages };
    }),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
        const existing = messages[lastIndex].content;
        // Only add paragraph break when resuming text after a tool call,
        // not between regular streaming chunks.
        let joined: string;
        if (state.lastEventWasTool && existing.length > 0) {
          joined = existing + '\n\n' + content;
        } else {
          joined = existing + content;
        }
        messages[lastIndex] = {
          ...messages[lastIndex],
          content: joined,
        };
      }
      return { messages, lastEventWasTool: false };
    }),

  markToolEvent: () => set({ lastEventWasTool: true }),
  setSessionId: (sessionId) => set({ sessionId }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  clearMessages: () => set({ messages: [], sessionId: null, lastEventWasTool: false }),
}));
