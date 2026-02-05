import { z } from 'zod';
import { listConversations, listConversationsSchema, ListConversationsInput } from './listConversations.js';
import { listMessages, listMessagesSchema, ListMessagesInput } from './listMessages.js';
import { searchMessages, searchMessagesSchema, SearchMessagesInput } from './searchMessages.js';
import { readConversation, readConversationSchema, ReadConversationInput } from './readConversation.js';
import { sendMessage, sendMessageSchema, SendMessageInput } from './sendMessage.js';
import { searchContacts, searchContactsSchema, SearchContactsInput } from './searchContacts.js';

export interface IMessageTool {
  name: string;
  description: string;
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  execute: (args: unknown) => Promise<string>;
}

// Create schema objects
const listConversationsZodSchema = z.object(listConversationsSchema);
const listMessagesZodSchema = z.object(listMessagesSchema);
const searchMessagesZodSchema = z.object(searchMessagesSchema);
const readConversationZodSchema = z.object(readConversationSchema);
const sendMessageZodSchema = z.object(sendMessageSchema);
const searchContactsZodSchema = z.object(searchContactsSchema);

export const imessageTools: IMessageTool[] = [
  {
    name: 'imessage_list_conversations',
    description: 'List recent iMessage conversations, showing contacts/groups and their last messages. Use this to see who the user has been messaging and get an overview of recent chats.',
    schema: listConversationsZodSchema,
    execute: (args) => listConversations(args as ListConversationsInput),
  },
  {
    name: 'imessage_list_messages',
    description: 'List recent iMessages, optionally filtered by contact or time period. Good for seeing recent activity or messages from a specific person. Use hoursAgo to filter by recency.',
    schema: listMessagesZodSchema,
    execute: (args) => listMessages(args as ListMessagesInput),
  },
  {
    name: 'imessage_search',
    description: `Search iMessages for specific text content. Features:
- Case-insensitive search
- Multiple words: all words must be present (AND logic)
- Quoted phrases: "exact phrase" for exact matching
- Filter by contact name, phone, or email
- Filter by time period (daysBack)
- Filter by sender (fromMe: true/false)
Examples: "dinner plans", "meeting tomorrow" from:mom, "flight" daysBack:7`,
    schema: searchMessagesZodSchema,
    execute: (args) => searchMessages(args as SearchMessagesInput),
  },
  {
    name: 'imessage_read_conversation',
    description: 'Read the full conversation history with a specific contact or group. Shows messages in chronological order. Use contact parameter with phone number, email, or display name.',
    schema: readConversationZodSchema,
    execute: (args) => readConversation(args as ReadConversationInput),
  },
  {
    name: 'imessage_send',
    description: 'Send an iMessage to a contact. Requires phone number with country code (e.g., +12025551234) or email address. ALWAYS confirm with the user before sending any message.',
    schema: sendMessageZodSchema,
    execute: (args) => sendMessage(args as SendMessageInput),
  },
  {
    name: 'contacts_search',
    description: 'Search the user\'s macOS Contacts by name. Use this to find phone numbers or emails before sending a message. Returns all matching contacts with their phone numbers and email addresses.',
    schema: searchContactsZodSchema,
    execute: (args) => searchContacts(args as SearchContactsInput),
  },
];

export function getIMessageToolNames(): string[] {
  return imessageTools.map(t => t.name);
}
