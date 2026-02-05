import { useRef, useEffect } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';

export function ChatContainer() {
  const { messages, isStreaming, clearMessages } = useChatStore();
  const { sendMessage, cancelStream } = useChat();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <img src="/panda.png" alt="Oscar" className="w-14 h-14 mb-4 opacity-30" />
        <p className="text-oscar-500 text-sm mb-1.5">
          Connect Gmail to get started
        </p>
        <p className="text-oscar-400 text-xs">
          iMessage and Clay are ready
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
              <img src="/panda.png" alt="Oscar" className="w-10 h-10 mb-3 opacity-15" />
              <p className="text-oscar-400 text-sm">
                Ask me anything about your emails, messages, or contacts
              </p>
            </div>
          ) : (
            <>
              {messages.length > 0 && (
                <div className="flex justify-end mb-3">
                  <button
                    onClick={clearMessages}
                    className="text-[11px] text-oscar-300 hover:text-oscar-500 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
              <MessageList messages={messages} />
              {isStreaming && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-oscar-100">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <ChatInput
            onSend={sendMessage}
            onCancel={cancelStream}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
