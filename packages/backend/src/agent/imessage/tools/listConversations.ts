import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const listConversationsSchema = {
  maxResults: z.number().min(1).max(50).default(20)
    .describe('Maximum number of conversations to return'),
};

export type ListConversationsInput = z.infer<z.ZodObject<typeof listConversationsSchema>>;

interface Conversation {
  chatId: string;
  participants: string[];
  displayName: string | null;
  lastMessage: string | null;
  isGroupChat: boolean;
}

export async function listConversations(args: ListConversationsInput): Promise<string> {
  const { maxResults } = args;

  // AppleScript to get conversations - using linefeed for actual newlines
  const appleScript = `
    set output to ""
    set lf to ASCII character 10
    tell application "Messages"
      set chatList to chats
      set chatCount to 0
      repeat with c in chatList
        if chatCount >= ${maxResults} then exit repeat
        try
          set chatId to id of c
          set chatName to name of c

          -- Get participants
          set participantList to ""
          try
            repeat with p in participants of c
              if participantList is not "" then set participantList to participantList & "|"
              set participantList to participantList & (handle of p)
            end repeat
          end try

          -- Get last message
          set lastMsg to ""
          try
            set msgs to messages of c
            if (count of msgs) > 0 then
              set lastMessage to item 1 of msgs
              set msgContent to content of lastMessage
              if length of msgContent > 150 then
                set lastMsg to text 1 thru 150 of msgContent
              else
                set lastMsg to msgContent
              end if
            end if
          end try

          set output to output & "CHAT_START" & lf
          set output to output & "ID:" & chatId & lf
          set output to output & "NAME:" & chatName & lf
          set output to output & "PARTICIPANTS:" & participantList & lf
          set output to output & "LAST_MSG:" & lastMsg & lf
          set output to output & "CHAT_END" & lf

          set chatCount to chatCount + 1
        end try
      end repeat
    end tell
    return output
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    const conversations: Conversation[] = [];
    const chatBlocks = stdout.split('CHAT_START\n').filter(b => b.includes('CHAT_END'));

    for (const block of chatBlocks) {
      const lines = block.split('\n');
      const chat: Partial<Conversation> = {};

      for (const line of lines) {
        if (line.startsWith('ID:')) {
          chat.chatId = line.substring(3).trim();
        } else if (line.startsWith('NAME:')) {
          const name = line.substring(5).trim();
          chat.displayName = name === 'missing value' ? null : name;
        } else if (line.startsWith('PARTICIPANTS:')) {
          const participants = line.substring(13).trim();
          chat.participants = participants ? participants.split('|').filter(p => p && p !== 'missing value') : [];
        } else if (line.startsWith('LAST_MSG:')) {
          const msg = line.substring(9).trim();
          chat.lastMessage = msg && msg !== 'missing value' ? msg : null;
        }
      }

      if (chat.chatId) {
        chat.isGroupChat = (chat.participants?.length || 0) > 1 || chat.chatId?.includes('+;chat');
        conversations.push(chat as Conversation);
      }
    }

    return JSON.stringify({
      count: conversations.length,
      conversations: conversations.map(c => ({
        chatId: c.chatId,
        displayName: c.displayName || c.participants?.join(', ') || 'Unknown',
        participants: c.participants,
        isGroupChat: c.isGroupChat,
        lastMessage: c.lastMessage,
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
      error: `Failed to list conversations: ${errorMessage}`,
    }, null, 2);
  }
}
