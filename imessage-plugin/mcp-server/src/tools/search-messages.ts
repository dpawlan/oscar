import { getDatabase, appleToDate, formatDate, formatDateISO, dateToApple, parseSearchQuery, escapeRegExp, extractTextFromAttributedBody } from '../imessage-client.js';
import { getContactName, findHandlesByName } from '../contacts-client.js';

export interface SearchMessagesArgs {
  query: string;
  maxResults?: number;
  contact?: string;
  daysBack?: number;
  fromMe?: boolean;
  contextMessages?: number; // Number of messages before/after each result to include
}

interface MessageRow {
  message_id: number;
  text: string | null;
  attributedBody: Buffer | null;
  date: number;
  is_from_me: number;
  handle_id: string | null;
  chat_identifier: string | null;
  display_name: string | null;
}

export async function searchMessages(args: SearchMessagesArgs): Promise<string> {
  const db = getDatabase();
  // Get more results initially since we'll filter in code
  const fetchLimit = Math.min((args.maxResults || 20) * 3, 150);
  const maxResults = Math.min(args.maxResults || 20, 50);

  // Parse search query - support multiple terms (AND logic) and quoted phrases
  const searchTerms = parseSearchQuery(args.query);

  // Build query - we'll search both text column and filter attributedBody in code
  let query = `
    SELECT
      m.ROWID as message_id,
      m.text,
      m.attributedBody,
      m.date,
      m.is_from_me,
      h.id as handle_id,
      c.chat_identifier,
      c.display_name
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE ((m.text IS NOT NULL AND m.text != '') OR m.attributedBody IS NOT NULL)
  `;

  const params: (string | number)[] = [];

  // Handle contact filter - now supports contact names via Contacts.app lookup
  let resolvedHandles: string[] = [];
  if (args.contact) {
    // First, try to find handles by contact name
    resolvedHandles = findHandlesByName(args.contact);

    if (resolvedHandles.length > 0) {
      // Build the query parts
      const conditions: string[] = [];
      const handleParams: (string | number)[] = [];

      // Add exact match for each handle
      for (const handle of resolvedHandles) {
        conditions.push('h.id = ?');
        handleParams.push(handle);

        // Also check normalized versions (last 10 digits for phones)
        if (!handle.includes('@')) {
          const normalized = handle.replace(/\D/g, '').slice(-10);
          if (normalized.length === 10) {
            conditions.push('h.id LIKE ?');
            handleParams.push(`%${normalized}`);
          }
        }
      }

      query += ` AND (${conditions.join(' OR ')})`;
      params.push(...handleParams);
    } else {
      // Fall back to direct pattern matching (phone number or email provided directly)
      query += ` AND (LOWER(h.id) LIKE LOWER(?) OR LOWER(c.chat_identifier) LIKE LOWER(?) OR LOWER(c.display_name) LIKE LOWER(?))`;
      const contactPattern = `%${args.contact}%`;
      params.push(contactPattern, contactPattern, contactPattern);
    }
  }

  if (args.daysBack) {
    const cutoffDate = new Date(Date.now() - (args.daysBack * 24 * 60 * 60 * 1000));
    const cutoffApple = dateToApple(cutoffDate);
    query += ` AND m.date >= ?`;
    params.push(cutoffApple);
  }

  if (args.fromMe !== undefined) {
    query += ` AND m.is_from_me = ?`;
    params.push(args.fromMe ? 1 : 0);
  }

  query += ` ORDER BY m.date DESC LIMIT ?`;
  params.push(fetchLimit);

  const rows = db.prepare(query).all(...params) as MessageRow[];

  // Process messages and filter by search terms
  const messages: Array<{
    messageId: number;
    text: string;
    highlightedText: string;
    date: string | null;
    dateFormatted: string | null;
    isFromMe: boolean;
    sender: string;
    contact: string | null;
    contactName: string | null;
    chatName: string | null;
  }> = [];

  for (const row of rows) {
    if (messages.length >= maxResults) break;

    const date = appleToDate(row.date);

    // Get text from either column
    let messageText = row.text;
    if (!messageText && row.attributedBody) {
      messageText = extractTextFromAttributedBody(row.attributedBody);
    }

    if (!messageText) continue;

    // Check if all search terms match (AND logic)
    const textLower = messageText.toLowerCase();
    const allTermsMatch = searchTerms.every(term => textLower.includes(term.toLowerCase()));
    if (!allTermsMatch) continue;

    // Highlight all search terms in the text (case-insensitive)
    let highlightedText = messageText;
    for (const term of searchTerms) {
      highlightedText = highlightedText.replace(
        new RegExp(`(${escapeRegExp(term)})`, 'gi'),
        '**$1**'
      );
    }

    // Look up contact name from Contacts.app
    const contactName = row.handle_id ? getContactName(row.handle_id) : null;

    messages.push({
      messageId: row.message_id,
      text: messageText,
      highlightedText,
      date: formatDateISO(date),
      dateFormatted: formatDate(date),
      isFromMe: row.is_from_me === 1,
      sender: row.is_from_me === 1 ? 'Me' : (contactName || row.handle_id || 'Unknown'),
      contact: row.handle_id || row.chat_identifier,
      contactName: contactName,
      chatName: row.display_name || contactName || row.chat_identifier,
    });
  }

  // If contextMessages requested, fetch surrounding messages for each result
  const contextSize = Math.min(args.contextMessages || 0, 10);
  let resultsWithContext: Array<{
    match: typeof messages[0];
    context: {
      before: typeof messages;
      after: typeof messages;
    };
  }> = [];

  if (contextSize > 0 && messages.length > 0) {
    for (const msg of messages) {
      // Get messages before this one in the same chat
      const beforeQuery = `
        SELECT
          m.ROWID as message_id,
          m.text,
          m.attributedBody,
          m.date,
          m.is_from_me,
          h.id as handle_id,
          c.chat_identifier,
          c.display_name
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE c.chat_identifier = (
          SELECT c2.chat_identifier FROM message m2
          LEFT JOIN chat_message_join cmj2 ON m2.ROWID = cmj2.message_id
          LEFT JOIN chat c2 ON cmj2.chat_id = c2.ROWID
          WHERE m2.ROWID = ?
        )
        AND m.ROWID < ?
        AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
        ORDER BY m.date DESC
        LIMIT ?
      `;

      const afterQuery = `
        SELECT
          m.ROWID as message_id,
          m.text,
          m.attributedBody,
          m.date,
          m.is_from_me,
          h.id as handle_id,
          c.chat_identifier,
          c.display_name
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
        LEFT JOIN chat c ON cmj.chat_id = c.ROWID
        WHERE c.chat_identifier = (
          SELECT c2.chat_identifier FROM message m2
          LEFT JOIN chat_message_join cmj2 ON m2.ROWID = cmj2.message_id
          LEFT JOIN chat c2 ON cmj2.chat_id = c2.ROWID
          WHERE m2.ROWID = ?
        )
        AND m.ROWID > ?
        AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
        ORDER BY m.date ASC
        LIMIT ?
      `;

      const beforeRows = db.prepare(beforeQuery).all(msg.messageId, msg.messageId, contextSize) as MessageRow[];
      const afterRows = db.prepare(afterQuery).all(msg.messageId, msg.messageId, contextSize) as MessageRow[];

      const mapRow = (row: MessageRow) => {
        const date = appleToDate(row.date);
        let messageText = row.text;
        if (!messageText && row.attributedBody) {
          messageText = extractTextFromAttributedBody(row.attributedBody);
        }
        const contactName = row.handle_id ? getContactName(row.handle_id) : null;
        return {
          messageId: row.message_id,
          text: messageText || '',
          date: formatDateISO(date),
          dateFormatted: formatDate(date),
          isFromMe: row.is_from_me === 1,
          sender: row.is_from_me === 1 ? 'Me' : (contactName || row.handle_id || 'Unknown'),
          contact: row.handle_id || row.chat_identifier,
          contactName,
          chatName: row.display_name || contactName || row.chat_identifier,
        };
      };

      resultsWithContext.push({
        match: msg,
        context: {
          before: beforeRows.reverse().map(mapRow).filter(m => m.text),
          after: afterRows.map(mapRow).filter(m => m.text),
        },
      });
    }

    return JSON.stringify({
      query: args.query,
      searchTerms,
      totalResults: messages.length,
      filters: {
        contact: args.contact || null,
        contactResolvedTo: resolvedHandles.length > 0 ? resolvedHandles : null,
        daysBack: args.daysBack || null,
        fromMe: args.fromMe ?? null,
        contextMessages: contextSize,
      },
      results: resultsWithContext,
    }, null, 2);
  }

  return JSON.stringify({
    query: args.query,
    searchTerms,
    totalResults: messages.length,
    filters: {
      contact: args.contact || null,
      contactResolvedTo: resolvedHandles.length > 0 ? resolvedHandles : null,
      daysBack: args.daysBack || null,
      fromMe: args.fromMe ?? null,
    },
    results: messages,
  }, null, 2);
}

export const searchMessagesSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Search text. Multiple words use AND logic. Use quotes for exact phrases (e.g., "dinner plans")',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results (default: 20, max: 50)',
    },
    contact: {
      type: 'string',
      description: 'Filter by contact name (e.g., "John Smith"), phone number, or email. Names are looked up in Contacts.app.',
    },
    daysBack: {
      type: 'number',
      description: 'Only search messages from the last N days',
    },
    fromMe: {
      type: 'boolean',
      description: 'If true, only messages sent by user. If false, only received messages.',
    },
    contextMessages: {
      type: 'number',
      description: 'Number of messages to include before and after each search result for context (default: 0, max: 10). Use this to see the conversation around a match.',
    },
  },
  required: ['query'],
};
