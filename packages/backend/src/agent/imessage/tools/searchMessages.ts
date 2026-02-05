import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const searchMessagesSchema = {
  query: z.string()
    .describe('Search text to find in messages. Can include multiple words - all words must be present (AND logic). Use quotes for exact phrases.'),
  maxResults: z.number().min(1).max(50).default(20)
    .describe('Maximum number of results to return'),
  contact: z.string().optional()
    .describe('Filter by contact phone number or email'),
  daysBack: z.number().optional()
    .describe('Only search messages from the last N days'),
  fromMe: z.boolean().optional()
    .describe('If true, only show messages sent by user. If false, only show received messages.'),
};

export type SearchMessagesInput = z.infer<z.ZodObject<typeof searchMessagesSchema>>;

interface Message {
  text: string;
  date: string;
  isFromMe: boolean;
  sender: string;
  chatId: string;
  chatName: string;
}

// Parse search query into terms, respecting quoted phrases
function parseSearchQuery(query: string): string[] {
  const terms: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match;

  while ((match = regex.exec(query)) !== null) {
    const term = match[1] || match[2];
    if (term) {
      terms.push(term.toLowerCase());
    }
  }

  return terms;
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchMessages(args: SearchMessagesInput): Promise<string> {
  const { query, maxResults, contact, daysBack, fromMe } = args;

  // Parse search terms
  const searchTerms = parseSearchQuery(query);
  if (searchTerms.length === 0) {
    return JSON.stringify({
      success: false,
      error: 'Search query is empty',
    }, null, 2);
  }

  // Calculate cutoff date if daysBack is specified
  const cutoffDate = daysBack ? new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) : null;

  // AppleScript to get all messages - using linefeed for actual newlines
  const appleScript = `
    set output to ""
    set lf to ASCII character 10
    set msgCount to 0
    set maxMsgs to 500

    tell application "Messages"
      set chatList to chats
      repeat with c in chatList
        if msgCount >= maxMsgs then exit repeat
        try
          set chatId to id of c
          set chatName to name of c

          -- Check if this chat matches contact filter
          set matchesContact to true
          ${contact ? `
          set matchesContact to false
          if chatId contains "${contact.replace(/"/g, '\\"')}" then set matchesContact to true
          if chatName contains "${contact.replace(/"/g, '\\"')}" then set matchesContact to true
          try
            repeat with p in participants of c
              if (handle of p) contains "${contact.replace(/"/g, '\\"')}" then set matchesContact to true
            end repeat
          end try
          ` : ''}

          if matchesContact then
            set msgs to messages of c
            repeat with m in msgs
              if msgCount >= maxMsgs then exit repeat
              try
                set msgContent to content of m
                set msgDate to date sent of m
                set msgDirection to direction of m
                set senderHandle to ""
                try
                  set senderHandle to handle of sender of m
                on error
                  if msgDirection is incoming then
                    set senderHandle to chatId
                  else
                    set senderHandle to "Me"
                  end if
                end try

                -- Format date as ISO string
                set y to year of msgDate
                set mo to month of msgDate as integer
                set d to day of msgDate
                set h to hours of msgDate
                set mi to minutes of msgDate
                set s to seconds of msgDate
                set dateStr to "" & y & "-" & (text -2 thru -1 of ("0" & mo)) & "-" & (text -2 thru -1 of ("0" & d)) & "T" & (text -2 thru -1 of ("0" & h)) & ":" & (text -2 thru -1 of ("0" & mi)) & ":" & (text -2 thru -1 of ("0" & s))

                set isFromMe to "false"
                if msgDirection is outgoing then set isFromMe to "true"

                set output to output & "MSG_START" & lf
                set output to output & "TEXT:" & msgContent & lf
                set output to output & "DATE:" & dateStr & lf
                set output to output & "FROM_ME:" & isFromMe & lf
                set output to output & "SENDER:" & senderHandle & lf
                set output to output & "CHAT:" & chatId & lf
                set output to output & "CHAT_NAME:" & chatName & lf
                set output to output & "MSG_END" & lf

                set msgCount to msgCount + 1
              end try
            end repeat
          end if
        end try
      end repeat
    end tell
    return output
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 90000,
    });

    const messages: Message[] = [];
    const msgBlocks = stdout.split('MSG_START\n').filter(b => b.includes('MSG_END'));

    for (const block of msgBlocks) {
      const lines = block.split('\n');
      const msg: Partial<Message> = {};

      for (const line of lines) {
        if (line.startsWith('TEXT:')) {
          msg.text = line.substring(5).trim();
        } else if (line.startsWith('DATE:')) {
          msg.date = line.substring(5).trim();
        } else if (line.startsWith('FROM_ME:')) {
          msg.isFromMe = line.substring(8).trim() === 'true';
        } else if (line.startsWith('SENDER:')) {
          msg.sender = line.substring(7).trim();
        } else if (line.startsWith('CHAT:')) {
          msg.chatId = line.substring(5).trim();
        } else if (line.startsWith('CHAT_NAME:')) {
          msg.chatName = line.substring(10).trim();
        }
      }

      if (msg.text && msg.date) {
        // Apply text search filter - all terms must match (AND logic)
        const textLower = msg.text.toLowerCase();
        const matchesAllTerms = searchTerms.every(term => textLower.includes(term));
        if (!matchesAllTerms) continue;

        // Apply time filter if specified
        if (cutoffDate) {
          const msgDate = new Date(msg.date);
          if (msgDate < cutoffDate) continue;
        }

        // Apply fromMe filter if specified
        if (fromMe !== undefined && msg.isFromMe !== fromMe) continue;

        messages.push(msg as Message);
      }
    }

    // Sort by date descending and limit
    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedMessages = messages.slice(0, maxResults);

    // Highlight search terms in results
    const results = limitedMessages.map(m => {
      let highlightedText = m.text;
      for (const term of searchTerms) {
        highlightedText = highlightedText.replace(
          new RegExp(`(${escapeRegExp(term)})`, 'gi'),
          '**$1**'
        );
      }

      return {
        text: m.text,
        highlightedText,
        date: m.date,
        dateFormatted: new Date(m.date).toLocaleString(),
        isFromMe: m.isFromMe,
        sender: m.isFromMe ? 'Me' : m.sender,
        chatId: m.chatId,
        chatName: m.chatName === 'missing value' ? m.chatId : m.chatName,
      };
    });

    return JSON.stringify({
      query,
      searchTerms,
      totalResults: results.length,
      filters: {
        contact: contact || null,
        daysBack: daysBack || null,
        fromMe: fromMe ?? null,
      },
      results,
    }, null, 2);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not allowed') || errorMessage.includes('permission')) {
      return JSON.stringify({
        success: false,
        error: 'Permission denied. The app needs permission to access Messages.',
        suggestion: 'Go to System Settings > Privacy & Security > Automation and allow this app to control Messages.',
      }, null, 2);
    }

    return JSON.stringify({
      success: false,
      error: `Failed to search messages: ${errorMessage}`,
    }, null, 2);
  }
}
