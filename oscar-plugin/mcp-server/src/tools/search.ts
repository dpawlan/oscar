import { SearchResult } from '../sources/types.js';
import { searchIMessages } from '../sources/imessage.js';
import { searchGmail, getEmailThread } from '../sources/gmail.js';
import { resolveContact } from './resolve-contact.js';

export const searchSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Search text to find across all sources. Use natural language.',
    },
    contact: {
      type: 'string',
      description: 'Filter by contact name, nickname, or handle. Will automatically resolve nicknames.',
    },
    sources: {
      type: 'array',
      items: { type: 'string', enum: ['gmail', 'imessage', 'all'] },
      description: 'Which sources to search (default: all)',
    },
    daysBack: {
      type: 'number',
      description: 'Only search last N days (default: no limit)',
    },
    contextMessages: {
      type: 'number',
      description: 'Number of messages before/after each result for context (default: 3 for iMessage, full thread for Gmail)',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum results per source (default: 10)',
    },
  },
  required: [],
};

export interface SearchArgs {
  query?: string;
  contact?: string;
  sources?: string[];
  daysBack?: number;
  contextMessages?: number;
  maxResults?: number;
}

export async function search(args: SearchArgs): Promise<string> {
  const sources = args.sources || ['all'];
  const searchAll = sources.includes('all');
  const searchIMessage = searchAll || sources.includes('imessage');
  const searchGmailSource = searchAll || sources.includes('gmail');
  const maxResults = args.maxResults || 10;
  const contextMessages = args.contextMessages ?? 3;

  // Resolve contact if provided
  let resolvedHandles: string[] = [];
  let resolvedContactName: string | null = null;

  if (args.contact) {
    try {
      const resolved = JSON.parse(await resolveContact({ name: args.contact }));
      if (resolved.bestMatch) {
        resolvedHandles = resolved.handles;
        resolvedContactName = resolved.bestMatch.contact.name;
      }
    } catch {
      // Fall back to using contact as-is
    }
  }

  const allResults: {
    source: string;
    results: SearchResult[];
    error?: string;
  }[] = [];

  // Search iMessage
  if (searchIMessage) {
    try {
      const iMessageResults = await searchIMessages({
        query: args.query,
        handles: resolvedHandles.length > 0 ? resolvedHandles : undefined,
        contact: resolvedHandles.length === 0 ? args.contact : undefined,
        daysBack: args.daysBack,
        maxResults,
        contextMessages,
      });

      allResults.push({
        source: 'imessage',
        results: iMessageResults,
      });
    } catch (error) {
      allResults.push({
        source: 'imessage',
        results: [],
        error: error instanceof Error ? error.message : 'Failed to search iMessage',
      });
    }
  }

  // Search Gmail
  if (searchGmailSource) {
    try {
      const gmailResults = await searchGmail({
        query: args.query,
        contact: resolvedHandles.find(h => h.includes('@')) || args.contact,
        daysBack: args.daysBack,
        maxResults,
        includeBody: true,
      });

      // Fetch full thread for context
      if (contextMessages > 0) {
        for (const result of gmailResults) {
          if (result.message.threadId) {
            try {
              const threadMessages = await getEmailThread(result.message.threadId);
              const matchIndex = threadMessages.findIndex(m => m.id === result.message.id);

              if (matchIndex >= 0) {
                result.context = {
                  before: threadMessages.slice(Math.max(0, matchIndex - contextMessages), matchIndex),
                  after: threadMessages.slice(matchIndex + 1, matchIndex + 1 + contextMessages),
                };
              }
            } catch {
              // Skip thread fetch on error
            }
          }
        }
      }

      allResults.push({
        source: 'gmail',
        results: gmailResults,
      });
    } catch (error) {
      allResults.push({
        source: 'gmail',
        results: [],
        error: error instanceof Error ? error.message : 'Failed to search Gmail',
      });
    }
  }

  // Combine and format results
  const totalResults = allResults.reduce((sum, s) => sum + s.results.length, 0);

  return JSON.stringify({
    query: args.query || null,
    contact: {
      requested: args.contact || null,
      resolved: resolvedContactName,
      handles: resolvedHandles.length > 0 ? resolvedHandles : null,
    },
    filters: {
      sources: searchAll ? 'all' : sources,
      daysBack: args.daysBack || null,
      contextMessages,
    },
    totalResults,
    results: allResults.map(source => ({
      source: source.source,
      count: source.results.length,
      error: source.error,
      items: source.results.map(r => ({
        id: r.message.id,
        text: r.message.text.substring(0, 500),
        date: r.message.date,
        isFromMe: r.message.isFromMe,
        sender: r.message.sender,
        subject: r.message.subject,
        contact: r.message.contact?.name || r.message.sender,
        context: r.context ? {
          before: r.context.before.map(m => ({
            text: m.text.substring(0, 200),
            date: m.date,
            sender: m.sender,
          })),
          after: r.context.after.map(m => ({
            text: m.text.substring(0, 200),
            date: m.date,
            sender: m.sender,
          })),
        } : null,
      })),
    })),
  }, null, 2);
}
