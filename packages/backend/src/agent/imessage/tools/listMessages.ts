import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const listMessagesSchema = {
  maxResults: z.number().min(1).max(100).default(20)
    .describe('Maximum number of messages to return'),
  contact: z.string().optional()
    .describe('Filter by contact phone number or email (e.g., "+1234567890" or "john@example.com")'),
  hoursAgo: z.number().optional()
    .describe('Only show messages from the last N hours'),
};

export type ListMessagesInput = z.infer<z.ZodObject<typeof listMessagesSchema>>;

interface Message {
  text: string;
  date: string;
  isFromMe: boolean;
  sender: string;
  chatId: string;
}

export async function listMessages(args: ListMessagesInput): Promise<string> {
  const { maxResults, contact, hoursAgo } = args;

  // Calculate cutoff date if hoursAgo is specified
  const cutoffDate = hoursAgo ? new Date(Date.now() - hoursAgo * 60 * 60 * 1000) : null;

  // AppleScript to get messages - using linefeed for actual newlines
  const appleScript = `
    set output to ""
    set lf to ASCII character 10
    set msgCount to 0
    set maxMsgs to ${Math.min(maxResults * 3, 200)}

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

                -- Truncate long messages
                if length of msgContent > 300 then
                  set msgContent to text 1 thru 300 of msgContent
                end if

                set output to output & "MSG_START" & lf
                set output to output & "TEXT:" & msgContent & lf
                set output to output & "DATE:" & dateStr & lf
                set output to output & "FROM_ME:" & isFromMe & lf
                set output to output & "SENDER:" & senderHandle & lf
                set output to output & "CHAT:" & chatId & lf
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
      timeout: 60000,
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
        }
      }

      if (msg.text && msg.date) {
        // Apply time filter if specified
        if (cutoffDate) {
          const msgDate = new Date(msg.date);
          if (msgDate < cutoffDate) continue;
        }
        messages.push(msg as Message);
      }
    }

    // Sort by date descending and limit
    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedMessages = messages.slice(0, maxResults);

    return JSON.stringify({
      count: limitedMessages.length,
      filters: {
        contact: contact || null,
        hoursAgo: hoursAgo || null,
      },
      messages: limitedMessages.map(m => ({
        text: m.text,
        date: m.date,
        dateFormatted: new Date(m.date).toLocaleString(),
        isFromMe: m.isFromMe,
        sender: m.isFromMe ? 'Me' : m.sender,
        chatId: m.chatId,
      })),
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
      error: `Failed to list messages: ${errorMessage}`,
    }, null, 2);
  }
}
