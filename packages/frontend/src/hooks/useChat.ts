import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuth } from './useAuth';
import type { ChatStreamEvent } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useChat() {
  const { userId } = useAuth();
  const {
    sessionId,
    setSessionId,
    addMessage,
    updateLastMessage,
    appendToLastMessage,
    markToolEvent,
    setIsStreaming,
  } = useChatStore();

  const eventSourceRef = useRef<EventSource | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !content.trim()) return;

      // Add user message to store
      addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      });

      // Create assistant message placeholder
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });

      setIsStreaming(true);

      // Build SSE URL
      const params = new URLSearchParams({
        userId,
        message: content.trim(),
        ...(sessionId && { sessionId }),
      });

      const eventSource = new EventSource(`${API_URL}/chat/stream?${params}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: ChatStreamEvent = JSON.parse(event.data);

          switch (data.type) {
            case 'text':
              if (data.content) {
                appendToLastMessage(data.content);
              }
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
              break;

            case 'tool_use':
              updateLastMessage({
                toolUse: {
                  name: data.name || 'unknown',
                  status: 'pending',
                },
              });
              break;

            case 'tool_result':
              updateLastMessage({
                toolUse: {
                  name: data.name || 'unknown',
                  status: data.success ? 'success' : 'error',
                },
              });
              markToolEvent();
              break;

            case 'done':
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
              setIsStreaming(false);
              eventSource.close();
              break;

            case 'error':
              updateLastMessage({
                content: `Error: ${data.message || 'An error occurred'}`,
              });
              setIsStreaming(false);
              eventSource.close();
              break;
          }
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };

      eventSource.onerror = () => {
        setIsStreaming(false);
        eventSource.close();
      };
    },
    [
      userId,
      sessionId,
      addMessage,
      updateLastMessage,
      appendToLastMessage,
      markToolEvent,
      setIsStreaming,
      setSessionId,
    ]
  );

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, [setIsStreaming]);

  return { sendMessage, cancelStream };
}
