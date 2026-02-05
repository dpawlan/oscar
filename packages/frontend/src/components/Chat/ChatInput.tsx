import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface Props {
  onSend: (message: string) => void;
  onCancel: () => void;
  disabled: boolean;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onCancel, disabled, isStreaming }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Oscar anything..."
        className="w-full resize-none rounded-xl bg-oscar-50/80 border border-oscar-200/50 px-4 py-3 pr-12
          focus:outline-none focus:border-oscar-300 focus:bg-white
          placeholder:text-oscar-400
          min-h-[46px] max-h-[140px] text-sm text-oscar-700 transition-all"
        rows={1}
        disabled={isStreaming}
      />
      <div className="absolute right-2 bottom-2">
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-oscar-400 hover:text-oscar-600 hover:bg-oscar-100 transition-colors"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" rx="1.5" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg text-oscar-400 hover:text-oscar-700 hover:bg-oscar-100
              disabled:text-oscar-200 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Send"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-4-4m4 4l-4 4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
