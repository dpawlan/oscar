import { searchIMessages } from '../sources/imessage.js';
import { searchGmail, getEmailThread } from '../sources/gmail.js';
import { resolveContact } from './resolve-contact.js';

export const getContextSchema = {
  type: 'object' as const,
  properties: {
    contact: {
      type: 'string',
      description: 'Contact name, nickname, or handle to get conversation from',
    },
    source: {
      type: 'string',
      enum: ['imessage', 'gmail'],
      description: 'Which source to get context from',
    },
    around: {
      type: 'string',
      description: 'Optional keyword or phrase to center the context around',
    },
    maxMessages: {
      type: 'number',
      description: 'Maximum messages to return (default: 30)',
    },
    daysBack: {
      type: 'number',
      description: 'Only get messages from last N days',
    },
  },
  required: ['contact', 'source'],
};

export interface GetContextArgs {
  contact: string;
  source: 'imessage' | 'gmail';
  around?: string;
  maxMessages?: number;
  daysBack?: number;
}

export async function getContext(args: GetContextArgs): Promise<string> {
  const { contact, source, around, maxMessages = 30, daysBack } = args;

  // Resolve the contact first
  let resolvedHandles: string[] = [];
  let resolvedContactName: string | null = null;

  try {
    const resolved = JSON.parse(await resolveContact({ name: contact }));
    if (resolved.bestMatch) {
      resolvedHandles = resolved.handles;
      resolvedContactName = resolved.bestMatch.contact.name;
    }
  } catch {
    // Fall back to using contact as-is
  }

  if (source === 'imessage') {
    return getIMessageContext(contact, resolvedHandles, resolvedContactName, around, maxMessages, daysBack);
  } else {
    return getGmailContext(contact, resolvedHandles, resolvedContactName, around, maxMessages, daysBack);
  }
}

async function getIMessageContext(
  contact: string,
  handles: string[],
  resolvedName: string | null,
  around: string | undefined,
  maxMessages: number,
  daysBack?: number
): Promise<string> {
  // If we have a keyword to center around, search for it first
  if (around) {
    const results = await searchIMessages({
      query: around,
      handles: handles.length > 0 ? handles : undefined,
      contact: handles.length === 0 ? contact : undefined,
      daysBack,
      maxResults: 5,
      contextMessages: Math.floor(maxMessages / 2),
    });

    if (results.length > 0) {
      // Return the first match with its context
      const match = results[0];
      const allMessages = [
        ...(match.context?.before || []),
        match.message,
        ...(match.context?.after || []),
      ];

      return JSON.stringify({
        contact: {
          requested: contact,
          resolved: resolvedName,
          handles: handles.length > 0 ? handles : null,
        },
        source: 'imessage',
        centeredAround: around,
        matchFound: true,
        conversation: allMessages.map(m => ({
          text: m.text,
          date: m.date,
          isFromMe: m.isFromMe,
          sender: m.sender,
          isMatch: m.id === match.message.id,
        })),
      }, null, 2);
    }
  }

  // Otherwise, get recent conversation
  const results = await searchIMessages({
    handles: handles.length > 0 ? handles : undefined,
    contact: handles.length === 0 ? contact : undefined,
    daysBack,
    maxResults: maxMessages,
  });

  // Sort chronologically
  const sorted = results
    .map(r => r.message)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return JSON.stringify({
    contact: {
      requested: contact,
      resolved: resolvedName,
      handles: handles.length > 0 ? handles : null,
    },
    source: 'imessage',
    centeredAround: around || null,
    matchFound: false,
    messageCount: sorted.length,
    conversation: sorted.map(m => ({
      text: m.text,
      date: m.date,
      isFromMe: m.isFromMe,
      sender: m.sender,
    })),
  }, null, 2);
}

async function getGmailContext(
  contact: string,
  handles: string[],
  resolvedName: string | null,
  around: string | undefined,
  maxMessages: number,
  daysBack?: number
): Promise<string> {
  const emailHandle = handles.find(h => h.includes('@'));
  const searchContact = emailHandle || contact;

  // Build query
  let query = around || '';

  const results = await searchGmail({
    query: query || undefined,
    contact: searchContact,
    daysBack,
    maxResults: Math.min(maxMessages, 20),
    includeBody: true,
  });

  // Get full threads for context
  const threads: Array<{
    threadId: string;
    subject: string;
    messages: Array<{
      text: string;
      date: string;
      isFromMe: boolean;
      sender: string;
      isMatch?: boolean;
    }>;
  }> = [];

  const seenThreads = new Set<string>();

  for (const result of results) {
    if (result.message.threadId && !seenThreads.has(result.message.threadId)) {
      seenThreads.add(result.message.threadId);

      try {
        const threadMessages = await getEmailThread(result.message.threadId);

        threads.push({
          threadId: result.message.threadId,
          subject: result.message.subject || 'No subject',
          messages: threadMessages.map(m => ({
            text: m.text.substring(0, 1000),
            date: m.date,
            isFromMe: m.isFromMe,
            sender: m.sender,
            isMatch: m.id === result.message.id,
          })),
        });
      } catch {
        // Skip thread on error
      }

      if (threads.length >= 5) break; // Limit threads
    }
  }

  return JSON.stringify({
    contact: {
      requested: contact,
      resolved: resolvedName,
      handles: handles.length > 0 ? handles : null,
    },
    source: 'gmail',
    centeredAround: around || null,
    threadCount: threads.length,
    threads,
  }, null, 2);
}
