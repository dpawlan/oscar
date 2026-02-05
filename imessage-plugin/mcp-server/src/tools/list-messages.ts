import { getDatabase, appleToDate, formatDate, formatDateISO, dateToApple, extractTextFromAttributedBody } from '../imessage-client.js';
import { getContactName, findHandlesByName } from '../contacts-client.js';

export interface ListMessagesArgs {
  maxResults?: number;
  contact?: string;
  hoursAgo?: number;
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

export async function listMessages(args: ListMessagesArgs): Promise<string> {
  const db = getDatabase();
  const maxResults = Math.min(args.maxResults || 20, 100);

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
  let resolvedHandles: string[] = [];

  if (args.contact) {
    // First, try to resolve contact name to phone/email handles
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
      // Fall back to direct pattern matching
      query += ` AND (LOWER(h.id) LIKE LOWER(?) OR LOWER(c.chat_identifier) LIKE LOWER(?) OR LOWER(c.display_name) LIKE LOWER(?))`;
      const contactPattern = `%${args.contact}%`;
      params.push(contactPattern, contactPattern, contactPattern);
    }
  }

  if (args.hoursAgo) {
    const cutoffDate = new Date(Date.now() - (args.hoursAgo * 60 * 60 * 1000));
    const cutoffApple = dateToApple(cutoffDate);
    query += ` AND m.date >= ?`;
    params.push(cutoffApple);
  }

  query += ` ORDER BY m.date DESC LIMIT ?`;
  params.push(maxResults);

  const rows = db.prepare(query).all(...params) as MessageRow[];

  const messages = rows.map(row => {
    const date = appleToDate(row.date);
    const contactName = row.handle_id ? getContactName(row.handle_id) : null;

    // Get text from either column
    let messageText = row.text;
    if (!messageText && row.attributedBody) {
      messageText = extractTextFromAttributedBody(row.attributedBody);
    }

    return {
      messageId: row.message_id,
      text: messageText,
      date: formatDateISO(date),
      dateFormatted: formatDate(date),
      isFromMe: row.is_from_me === 1,
      sender: row.is_from_me === 1 ? 'Me' : (contactName || row.handle_id || 'Unknown'),
      contact: row.handle_id || row.chat_identifier,
      contactName,
      chatName: row.display_name || contactName || row.chat_identifier,
    };
  }).filter(m => m.text); // Only include messages with extractable text

  return JSON.stringify({
    count: messages.length,
    filters: {
      contact: args.contact || null,
      contactResolvedTo: resolvedHandles.length > 0 ? resolvedHandles : null,
      hoursAgo: args.hoursAgo || null,
    },
    messages,
  }, null, 2);
}

export const listMessagesSchema = {
  type: 'object' as const,
  properties: {
    maxResults: {
      type: 'number',
      description: 'Maximum number of messages to return (default: 20, max: 100)',
    },
    contact: {
      type: 'string',
      description: 'Filter by contact name (e.g., "John Smith"), phone number, or email. Names are looked up in Contacts.app.',
    },
    hoursAgo: {
      type: 'number',
      description: 'Only show messages from the last N hours',
    },
  },
};
