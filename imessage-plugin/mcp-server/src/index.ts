#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listConversations, listConversationsSchema } from './tools/list-conversations.js';
import { listMessages, listMessagesSchema } from './tools/list-messages.js';
import { searchMessages, searchMessagesSchema } from './tools/search-messages.js';
import { readConversation, readConversationSchema } from './tools/read-conversation.js';

const server = new Server(
  {
    name: 'imessage-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all available tools
const tools = [
  {
    name: 'imessage_list_conversations',
    description: 'List recent iMessage conversations, showing contacts/groups and their last messages. Use this to see who the user has been messaging and get an overview of recent chats.',
    inputSchema: listConversationsSchema,
  },
  {
    name: 'imessage_list_messages',
    description: 'List recent iMessages, optionally filtered by contact or time period. Good for seeing recent activity or messages from a specific person. Use hoursAgo to filter by recency.',
    inputSchema: listMessagesSchema,
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
Examples: "dinner plans", query with contact filter, "flight" with daysBack:7`,
    inputSchema: searchMessagesSchema,
  },
  {
    name: 'imessage_read_conversation',
    description: 'Read the full conversation history with a specific contact or group. Shows messages in chronological order. Use contact parameter with phone number, email, or display name.',
    inputSchema: readConversationSchema,
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'imessage_list_conversations':
        result = await listConversations(args as unknown as Parameters<typeof listConversations>[0]);
        break;
      case 'imessage_list_messages':
        result = await listMessages(args as unknown as Parameters<typeof listMessages>[0]);
        break;
      case 'imessage_search':
        result = await searchMessages(args as unknown as Parameters<typeof searchMessages>[0]);
        break;
      case 'imessage_read_conversation':
        result = await readConversation(args as unknown as Parameters<typeof readConversation>[0]);
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('iMessage MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
