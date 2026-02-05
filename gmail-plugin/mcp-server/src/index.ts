#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listEmails, listEmailsSchema } from './tools/list-emails.js';
import { readEmail, readEmailSchema } from './tools/read-email.js';
import { sendEmail, sendEmailSchema } from './tools/send-email.js';
import { searchEmails, searchEmailsSchema } from './tools/search-emails.js';
import { listLabels, listLabelsSchema } from './tools/list-labels.js';
import { createLabel, createLabelSchema } from './tools/create-label.js';
import { addLabel, addLabelSchema } from './tools/add-label.js';
import { removeLabel, removeLabelSchema } from './tools/remove-label.js';

const server = new Server(
  {
    name: 'gmail-mcp-server',
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
    name: 'gmail_list_emails',
    description: 'List emails from Gmail inbox with optional filtering by label and read status',
    inputSchema: listEmailsSchema,
  },
  {
    name: 'gmail_read_email',
    description: 'Read the full content of a specific email by its ID',
    inputSchema: readEmailSchema,
  },
  {
    name: 'gmail_send_email',
    description: 'Send a new email or reply to an existing email thread',
    inputSchema: sendEmailSchema,
  },
  {
    name: 'gmail_search_emails',
    description: 'Search emails using Gmail query syntax (e.g., "from:example@gmail.com is:unread")',
    inputSchema: searchEmailsSchema,
  },
  {
    name: 'gmail_list_labels',
    description: 'List all Gmail labels including system labels and custom labels',
    inputSchema: listLabelsSchema,
  },
  {
    name: 'gmail_create_label',
    description: 'Create a new Gmail label with optional color customization',
    inputSchema: createLabelSchema,
  },
  {
    name: 'gmail_add_label',
    description: 'Add a label to one or more emails',
    inputSchema: addLabelSchema,
  },
  {
    name: 'gmail_remove_label',
    description: 'Remove a label from one or more emails',
    inputSchema: removeLabelSchema,
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
      case 'gmail_list_emails':
        result = await listEmails(args as unknown as Parameters<typeof listEmails>[0]);
        break;
      case 'gmail_read_email':
        result = await readEmail(args as unknown as Parameters<typeof readEmail>[0]);
        break;
      case 'gmail_send_email':
        result = await sendEmail(args as unknown as Parameters<typeof sendEmail>[0]);
        break;
      case 'gmail_search_emails':
        result = await searchEmails(args as unknown as Parameters<typeof searchEmails>[0]);
        break;
      case 'gmail_list_labels':
        result = await listLabels();
        break;
      case 'gmail_create_label':
        result = await createLabel(args as unknown as Parameters<typeof createLabel>[0]);
        break;
      case 'gmail_add_label':
        result = await addLabel(args as unknown as Parameters<typeof addLabel>[0]);
        break;
      case 'gmail_remove_label':
        result = await removeLabel(args as unknown as Parameters<typeof removeLabel>[0]);
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
  console.error('Gmail MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
