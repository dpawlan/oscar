import { MessageItem } from './MessageItem';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-oscar-400 text-sm mb-6">
          Search across your emails, messages, and contacts
        </p>
        <div className="space-y-2 text-sm text-oscar-300">
          <p>"What apartment does Mandy live in?"</p>
          <p>"Find flight confirmations from last month"</p>
          <p>"Show me my conversation with Mom about dinner"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
