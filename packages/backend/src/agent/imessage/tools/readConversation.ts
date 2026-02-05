import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const readConversationSchema = {
  contact: z.string()
    .describe('Contact phone number, email, or chat identifier to read conversation from'),
  maxMessages: z.number().min(1).max(100).default(30)
    .describe('Maximum number of messages to retrieve'),
};

export type ReadConversationInput = z.infer<z.ZodObject<typeof readConversationSchema>>;

interface Message {
  text: string;
  date: string;
  isFromMe: boolean;
  sender: string;
}

interface ConversationInfo {
  chatId: string;
  chatName: string;
  participants: string[];
  isGroupChat: boolean;
}

export async function readConversation(args: ReadConversationInput): Promise<string> {
  const { contact, maxMessages } = args;

  // Escape contact for AppleScript
  const escapedContact = contact.replace(/"/g, '\\"');

  // AppleScript to find the chat and get messages - using linefeed for actual newlines
  const appleScript = `
    set output to ""
    set lf to ASCII character 10
    set foundChat to false

    tell application "Messages"
      set chatList to chats
      repeat with c in chatList
        try
          set chatId to id of c
          set chatName to name of c

          -- Check if this chat matches the contact
          set matchesContact to false
          if chatId contains "${escapedContact}" then set matchesContact to true
          if chatName contains "${escapedContact}" then set matchesContact to true
          try
            repeat with p in participants of c
              if (handle of p) contains "${escapedContact}" then set matchesContact to true
            end repeat
          end try

          if matchesContact then
            set foundChat to true

            -- Get participants
            set participantList to ""
            try
              repeat with p in participants of c
                if participantList is not "" then set participantList to participantList & "|"
                set participantList to participantList & (handle of p)
              end repeat
            end try

            -- Output chat info
            set output to output & "CHAT_INFO_START" & lf
            set output to output & "CHAT_ID:" & chatId & lf
            set output to output & "CHAT_NAME:" & chatName & lf
            set output to output & "PARTICIPANTS:" & participantList & lf
            set output to output & "CHAT_INFO_END" & lf

            -- Get messages
            set msgs to messages of c
            set msgCount to 0
            repeat with m in msgs
              if msgCount >= ${maxMessages} then exit repeat
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
                set output to output & "MSG_END" & lf

                set msgCount to msgCount + 1
              end try
            end repeat

            exit repeat
          end if
        end try
      end repeat
    end tell

    if not foundChat then
      set output to "NOT_FOUND"
    end if

    return output
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000,
    });

    // Check if chat was found
    if (stdout.trim() === 'NOT_FOUND') {
      return JSON.stringify({
        error: `No conversation found for contact: ${contact}`,
        suggestion: 'Try using the full phone number with country code (e.g., +1234567890) or check list_conversations for available chats',
      }, null, 2);
    }

    // Parse chat info
    let chatInfo: ConversationInfo | null = null;
    const chatInfoMatch = stdout.match(/CHAT_INFO_START\n([\s\S]*?)CHAT_INFO_END/);
    if (chatInfoMatch) {
      const infoLines = chatInfoMatch[1].split('\n');
      const info: Partial<ConversationInfo> = {};

      for (const line of infoLines) {
        if (line.startsWith('CHAT_ID:')) {
          info.chatId = line.substring(8).trim();
        } else if (line.startsWith('CHAT_NAME:')) {
          const name = line.substring(10).trim();
          info.chatName = name === 'missing value' ? '' : name;
        } else if (line.startsWith('PARTICIPANTS:')) {
          const participants = line.substring(13).trim();
          info.participants = participants ? participants.split('|').filter(p => p && p !== 'missing value') : [];
        }
      }

      if (info.chatId) {
        info.isGroupChat = (info.participants?.length || 0) > 1 || info.chatId.includes('+;chat');
        chatInfo = info as ConversationInfo;
      }
    }

    // Parse messages
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
        }
      }

      if (msg.text && msg.date) {
        messages.push(msg as Message);
      }
    }

    // Reverse to show chronological order (oldest first)
    messages.reverse();

    return JSON.stringify({
      conversation: chatInfo ? {
        chatId: chatInfo.chatId,
        displayName: chatInfo.chatName || chatInfo.participants?.join(', ') || contact,
        isGroupChat: chatInfo.isGroupChat,
        participants: chatInfo.participants,
      } : {
        displayName: contact,
        isGroupChat: false,
      },
      messageCount: messages.length,
      messages: messages.map(m => ({
        text: m.text,
        date: m.date,
        dateFormatted: new Date(m.date).toLocaleString(),
        isFromMe: m.isFromMe,
        sender: m.isFromMe ? 'Me' : m.sender,
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
      error: `Failed to read conversation: ${errorMessage}`,
    }, null, 2);
  }
}
