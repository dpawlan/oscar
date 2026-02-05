import { getDatabase, appleToDate, formatDate, formatDateISO } from '../imessage-client.js';
import { getContactName } from '../contacts-client.js';

export interface ListConversationsArgs {
  maxResults?: number;
}

interface ConversationRow {
  chat_id: number;
  chat_identifier: string;
  display_name: string | null;
  last_message_date: number;
  last_message: string | null;
  is_from_me: number;
  participant_count: number;
}

export async function listConversations(args: ListConversationsArgs): Promise<string> {
  const db = getDatabase();
  const maxResults = Math.min(args.maxResults || 20, 50);

  const query = `
    SELECT
      c.ROWID as chat_id,
      c.chat_identifier,
      c.display_name,
      MAX(m.date) as last_message_date,
      (SELECT text FROM message WHERE ROWID = MAX(m.ROWID)) as last_message,
      (SELECT is_from_me FROM message WHERE ROWID = MAX(m.ROWID)) as is_from_me,
      (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) as participant_count
    FROM chat c
    LEFT JOIN chat_message_join cmj ON c.ROWID = cmj.chat_id
    LEFT JOIN message m ON cmj.message_id = m.ROWID
    GROUP BY c.ROWID
    ORDER BY last_message_date DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(maxResults) as ConversationRow[];

  const conversations = rows.map(row => {
    const lastMessageDate = appleToDate(row.last_message_date);

    // For 1:1 chats, look up the contact name from Contacts.app
    let contactName: string | null = null;
    if (row.participant_count === 1 && row.chat_identifier) {
      // Extract the handle from chat_identifier (e.g., "iMessage;-;+15551234567" -> "+15551234567")
      const parts = row.chat_identifier.split(';');
      const handle = parts[parts.length - 1];
      contactName = getContactName(handle);
    }

    // Determine the best display name
    const displayName = row.display_name || contactName || row.chat_identifier;

    return {
      chatId: row.chat_id,
      identifier: row.chat_identifier,
      displayName,
      contactName,
      isGroupChat: row.participant_count > 1,
      participantCount: row.participant_count,
      lastMessageDate: formatDateISO(lastMessageDate),
      lastMessageDateFormatted: formatDate(lastMessageDate),
      lastMessage: row.last_message?.substring(0, 100) || null,
      lastMessageFromMe: row.is_from_me === 1,
    };
  });

  return JSON.stringify({
    count: conversations.length,
    conversations,
  }, null, 2);
}

export const listConversationsSchema = {
  type: 'object' as const,
  properties: {
    maxResults: {
      type: 'number',
      description: 'Maximum number of conversations to return (default: 20, max: 50)',
    },
  },
};
