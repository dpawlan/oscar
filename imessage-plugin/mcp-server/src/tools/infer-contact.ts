import { getDatabase, appleToDate, formatDateISO, extractTextFromAttributedBody } from '../imessage-client.js';
import { getContactName } from '../contacts-client.js';

export interface InferContactArgs {
  nickname: string;
  maxResults?: number;
}

interface MessageRow {
  message_id: number;
  text: string | null;
  attributedBody: Buffer | null;
  date: number;
  is_from_me: number;
  handle_id: string | null;
  chat_identifier: string | null;
}

interface HandleCount {
  handle: string;
  contactName: string | null;
  count: number;
  examples: Array<{
    text: string;
    date: string | null;
  }>;
}

export async function inferContact(args: InferContactArgs): Promise<string> {
  const db = getDatabase();
  const maxExamples = Math.min(args.maxResults || 5, 20);
  const nickname = args.nickname.toLowerCase();

  // Search for messages where the user (is_from_me = 1) mentions the nickname
  // This helps identify who they're referring to by that name
  const query = `
    SELECT
      m.ROWID as message_id,
      m.text,
      m.attributedBody,
      m.date,
      m.is_from_me,
      h.id as handle_id,
      c.chat_identifier
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE m.is_from_me = 1
      AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
    ORDER BY m.date DESC
    LIMIT 5000
  `;

  const rows = db.prepare(query).all() as MessageRow[];

  // Track which handles receive messages containing the nickname
  const handleCounts = new Map<string, HandleCount>();

  for (const row of rows) {
    let messageText = row.text;
    if (!messageText && row.attributedBody) {
      messageText = extractTextFromAttributedBody(row.attributedBody);
    }
    if (!messageText) continue;

    const textLower = messageText.toLowerCase();

    // Check if message contains the nickname
    // Look for patterns like "hey mandy", "mandy,", "hi mandy", or just "mandy" as a word
    const nicknamePattern = new RegExp(`\\b${nickname}\\b`, 'i');
    if (!nicknamePattern.test(textLower)) continue;

    // This message contains the nickname - record the recipient
    const handle = row.handle_id || row.chat_identifier;
    if (!handle) continue;

    if (!handleCounts.has(handle)) {
      handleCounts.set(handle, {
        handle,
        contactName: getContactName(handle),
        count: 0,
        examples: [],
      });
    }

    const entry = handleCounts.get(handle)!;
    entry.count++;

    if (entry.examples.length < maxExamples) {
      entry.examples.push({
        text: messageText.substring(0, 200),
        date: formatDateISO(appleToDate(row.date)),
      });
    }
  }

  // Also search for messages RECEIVED that might contain the nickname as a signature or self-reference
  const receivedQuery = `
    SELECT
      m.ROWID as message_id,
      m.text,
      m.attributedBody,
      m.date,
      m.is_from_me,
      h.id as handle_id,
      c.chat_identifier
    FROM message m
    LEFT JOIN handle h ON m.handle_id = h.ROWID
    LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
    LEFT JOIN chat c ON cmj.chat_id = c.ROWID
    WHERE m.is_from_me = 0
      AND (m.text IS NOT NULL OR m.attributedBody IS NOT NULL)
    ORDER BY m.date DESC
    LIMIT 5000
  `;

  const receivedRows = db.prepare(receivedQuery).all() as MessageRow[];

  for (const row of receivedRows) {
    let messageText = row.text;
    if (!messageText && row.attributedBody) {
      messageText = extractTextFromAttributedBody(row.attributedBody);
    }
    if (!messageText) continue;

    const textLower = messageText.toLowerCase();

    // Look for self-references like "this is mandy" or "-mandy" or "mandy here"
    const selfRefPatterns = [
      new RegExp(`this is ${nickname}`, 'i'),
      new RegExp(`-\\s*${nickname}\\s*$`, 'i'),
      new RegExp(`^${nickname} here`, 'i'),
      new RegExp(`it's ${nickname}`, 'i'),
    ];

    const isSelfRef = selfRefPatterns.some(p => p.test(textLower));
    if (!isSelfRef) continue;

    const handle = row.handle_id || row.chat_identifier;
    if (!handle) continue;

    if (!handleCounts.has(handle)) {
      handleCounts.set(handle, {
        handle,
        contactName: getContactName(handle),
        count: 0,
        examples: [],
      });
    }

    const entry = handleCounts.get(handle)!;
    entry.count += 2; // Weight self-references higher

    if (entry.examples.length < maxExamples) {
      entry.examples.push({
        text: `[Self-reference] ${messageText.substring(0, 200)}`,
        date: formatDateISO(appleToDate(row.date)),
      });
    }
  }

  // Sort by count and return top results
  const sorted = Array.from(handleCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topMatch = sorted[0];

  return JSON.stringify({
    nickname: args.nickname,
    inference: topMatch ? {
      likelyContact: topMatch.contactName || topMatch.handle,
      handle: topMatch.handle,
      confidence: topMatch.count > 10 ? 'high' : topMatch.count > 3 ? 'medium' : 'low',
      messageCount: topMatch.count,
      examples: topMatch.examples,
    } : null,
    allCandidates: sorted.map(s => ({
      contact: s.contactName || s.handle,
      handle: s.handle,
      messageCount: s.count,
    })),
    message: topMatch
      ? `"${args.nickname}" most likely refers to ${topMatch.contactName || topMatch.handle} (found in ${topMatch.count} messages)`
      : `Could not find any messages referring to "${args.nickname}"`,
  }, null, 2);
}

export const inferContactSchema = {
  type: 'object' as const,
  properties: {
    nickname: {
      type: 'string',
      description: 'The nickname, alias, or informal name to look up (e.g., "Mandy", "Mom", "Big J")',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum example messages to include per candidate (default: 5)',
    },
  },
  required: ['nickname'],
};
