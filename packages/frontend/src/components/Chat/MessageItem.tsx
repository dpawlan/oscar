import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../types';

// Map raw MCP tool names to friendly display names
function formatToolName(raw: string): string {
  const toolMap: Record<string, string> = {
    'mcp__gmail__list_emails': 'Checking emails',
    'mcp__gmail__search_emails': 'Searching emails',
    'mcp__gmail__read_email': 'Reading email',
    'mcp__gmail__send_email': 'Sending email',
    'mcp__gmail__scan_emails': 'Scanning emails',
    'mcp__gmail__list_labels': 'Fetching labels',
    'mcp__gmail__create_label': 'Creating label',
    'mcp__gmail__add_label': 'Adding label',
    'mcp__gmail__remove_label': 'Removing label',
    'mcp__imessage__imessage_list_conversations': 'Checking conversations',
    'mcp__imessage__imessage_list_messages': 'Fetching messages',
    'mcp__imessage__imessage_search': 'Searching iMessage',
    'mcp__imessage__imessage_read_conversation': 'Reading conversation',
    'mcp__imessage__imessage_send': 'Sending iMessage',
    'mcp__imessage__contacts_search': 'Searching contacts',
    'mcp__clay__clay_search_contacts': 'Searching Clay',
    'mcp__clay__clay_get_contact': 'Fetching contact',
    'mcp__clay__clay_get_contacts_bulk': 'Fetching contacts',
    'mcp__clay__clay_get_activity': 'Checking activity',
    'mcp__clay__clay_get_timeline': 'Fetching timeline',
    'mcp__clay__clay_add_note': 'Adding note',
    'mcp__clay__clay_create_contact': 'Creating contact',
    'mcp__clay__clay_enrich_email': 'Enriching email',
    'mcp__drive__list_drive_files': 'Searching Drive',
    'mcp__drive__send_email_with_attachment': 'Sending with attachment',
    'mcp__calendar__get_calendar_events': 'Checking calendar',
    'mcp__calendar__list_calendars': 'Listing calendars',
  };

  if (toolMap[raw]) return toolMap[raw];

  // Fallback: strip mcp__ prefix and format nicely
  const cleaned = raw.replace(/^mcp__\w+__/, '').replace(/_/g, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

interface Props {
  message: Message;
}

export function MessageItem({ message }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end py-2">
        <div className="max-w-[75%]">
          <div className="bg-oscar-800 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* Tool indicator */}
      {message.toolUse && (
        <div className="text-xs text-oscar-400 mb-2 flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              message.toolUse.status === 'pending'
                ? 'bg-amber-400 animate-pulse'
                : message.toolUse.status === 'success'
                ? 'bg-emerald-400'
                : 'bg-red-400'
            }`}
          />
          <span className="font-medium">{formatToolName(message.toolUse.name)}</span>
        </div>
      )}

      {/* Content */}
      {message.content ? (
        <div className="prose prose-sm prose-stone max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="text-oscar-700 text-sm leading-relaxed mb-2.5 last:mb-0">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-oscar-800">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside ml-4 mb-2.5 space-y-0.5 text-sm text-oscar-700">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside ml-4 mb-2.5 space-y-0.5 text-sm text-oscar-700">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <code className="block bg-oscar-50 border border-oscar-200/50 rounded-lg p-3 text-xs font-mono overflow-x-auto text-oscar-700">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="bg-oscar-100 text-oscar-700 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="mb-2.5">{children}</pre>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-oscar-600 hover:text-oscar-800 underline underline-offset-2 decoration-oscar-300"
                >
                  {children}
                </a>
              ),
              h1: ({ children }) => (
                <h1 className="text-base font-semibold text-oscar-800 mb-2 mt-3 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-semibold text-oscar-800 mb-1.5 mt-2.5 first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-medium text-oscar-800 mb-1 mt-2 first:mt-0">
                  {children}
                </h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-oscar-300 pl-3 italic text-oscar-500 mb-2.5">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-oscar-200 my-3" />,
              table: ({ children }) => (
                <div className="overflow-x-auto mb-2.5">
                  <table className="min-w-full text-sm border-collapse">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-oscar-50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-1.5 text-left font-medium text-oscar-600 border-b border-oscar-200 text-xs">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-1.5 text-oscar-700 border-b border-oscar-100 text-xs">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : message.toolUse ? (
        <div className="text-oscar-400 text-sm">Working...</div>
      ) : null}
    </div>
  );
}
