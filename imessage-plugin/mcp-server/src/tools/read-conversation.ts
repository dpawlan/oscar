import { getDatabase, appleToDate, formatDate, formatDateISO, dateToApple, extractTextFromAttributedBody } from '../imessage-client.js';
import { getContactName, findHandlesByName } from '../contacts-client.js';

export interface ReadConversationArgs {
  contact: string;
  maxMessages?: number;
  beforeDate?: string;
}

interface MessageRow {
  message_id: number;
  text: string | null;
  attributedBody: Buffer | null;
  date: number;
  is_from_me: number;
  handle_id: string | null;
}

interface ChatInfoRow {
  chat_identifier: string;
  display_name: string | null;
  participant_count: number;
}

export async function readConversation(args: ReadConversationArgs): Promise<string> {
  const db = getDatabase();
  const maxMessages = Math.min(args.maxMessages || 30, 100);

  // First, try to resolve contact name to phone/email handles
  const resolvedHandles = findHandlesByName(args.contact);

  let chatInfo: ChatInfoRow | undefined;
  let contactPattern: string;

  if (resolvedHandles.length > 0) {
    // Search by resolved handles
    const placeholders = resolvedHandles.map(() => 'LOWER(c.chat_identifier) LIKE LOWER(?)').join(' OR ');
    const chatQuery = `
      SELECT
        c.chat_identifier,
        c.display_name,
        (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) as participant_count
      FROM chat c
      WHERE ${placeholders}
      ORDER BY (SELECT MAX(m.date) FROM chat_message_join cmj JOIN message m ON cmj.message_id = m.ROWID WHERE cmj.chat_id = c.ROWID) DESC
      LIMIT 1
    `;
    const patterns = resolvedHandles.map(h => `%${h}%`);
    chatInfo = db.prepare(chatQuery).get(...patterns) as ChatInfoRow | undefined;
    contactPattern = patterns[0]; // Use first pattern for message query
  } else {
    // Fall back to direct pattern matching
    contactPattern = `%${args.contact}%`;
    const chatQuery = `
      SELECT
        c.chat_identifier,
        c.display_name,
        (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) as participant_count
      FROM chat c
      WHERE LOWER(c.chat_identifier) LIKE LOWER(?) OR LOWER(c.display_name) LIKE LOWER(?)
      LIMIT 1
    `;
    chatInfo = db.prepare(chatQuery).get(contactPattern, contactPattern) as ChatInfoRow | undefined;
  }

  if (!chatInfo) {
    return JSON.stringify({
      error: `No conversation found for contact: ${args.contact}`,
      suggestion: 'Try using the full phone number with country code (e.g., +1234567890) or check imessage_list_conversations for available chats',
      resolvedHandles: resolvedHandles.length > 0 ? resolvedHandles : null,
    }, null, 2);
  }

  // Look up contact name for display
  const parts = chatInfo.chat_identifier.split(';');
  const handle = parts[parts.length - 1];
  const contactName = getContactName(handle);

  // Get messages from this conversation
  let messageQuery = `
    SELECT
      m.ROWID as message_id,
      m.text,
      m.attributedBody,
      m.date,
      m.is_from_me,
      h.id as handle_id
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE c.chat_identifier = ?
      AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
  `;

  const params: (string | number)[] = [chatInfo.chat_identifier];

  if (args.beforeDate) {
    const beforeMs = new Date(args.beforeDate).getTime();
    const beforeApple = dateToApple(new Date(beforeMs));
    messageQuery += ` AND m.date < ?`;
    params.push(beforeApple);
  }

  messageQuery += ` ORDER BY m.date DESC LIMIT ?`;
  params.push(maxMessages);

  const rows = db.prepare(messageQuery).all(...params) as MessageRow[];

  // Reverse to show chronological order (oldest first) and process
  const messages = rows.reverse().map(row => {
    const date = appleToDate(row.date);
    const senderName = row.handle_id ? getContactName(row.handle_id) : null;

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
      sender: row.is_from_me === 1 ? 'Me' : (senderName || row.handle_id || args.contact),
    };
  }).filter(m => m.text); // Only include messages with extractable text

  // Get oldest message date for pagination
  const oldestMessage = messages.length > 0 ? messages[0] : null;

  return JSON.stringify({
    conversation: {
      identifier: chatInfo.chat_identifier,
      displayName: chatInfo.display_name || contactName || chatInfo.chat_identifier,
      contactName,
      isGroupChat: chatInfo.participant_count > 1,
      participantCount: chatInfo.participant_count,
    },
    messageCount: messages.length,
    oldestMessageDate: oldestMessage?.date || null,
    messages,
  }, null, 2);
}

export const readConversationSchema = {
  type: 'object' as const,
  properties: {
    contact: {
      type: 'string',
      description: 'Contact name (e.g., "John Smith"), phone number, email, or display name. Names are looked up in Contacts.app.',
    },
    maxMessages: {
      type: 'number',
      description: 'Maximum number of messages to retrieve (default: 30, max: 100)',
    },
    beforeDate: {
      type: 'string',
      description: 'ISO date string - only get messages before this date (for pagination)',
    },
  },
  required: ['contact'],
};
