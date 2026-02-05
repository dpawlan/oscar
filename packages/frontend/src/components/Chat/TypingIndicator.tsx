export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-oscar-400 text-sm mt-3">
      <div className="flex space-x-1">
        <div
          className="w-1.5 h-1.5 bg-oscar-300 rounded-full"
          style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: '0ms' }}
        />
        <div
          className="w-1.5 h-1.5 bg-oscar-300 rounded-full"
          style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: '200ms' }}
        />
        <div
          className="w-1.5 h-1.5 bg-oscar-300 rounded-full"
          style={{ animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: '400ms' }}
        />
      </div>
    </div>
  );
}
