#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { searchContacts, searchContactsSchema } from './tools/search-contacts.js';
import { getContact, getContactSchema } from './tools/get-contact.js';
import { getContactsBulk, getContactsBulkSchema } from './tools/get-contacts-bulk.js';
import { getActivity, getActivitySchema } from './tools/get-activity.js';
import { getTimeline, getTimelineSchema } from './tools/get-timeline.js';
import { addNote, addNoteSchema } from './tools/add-note.js';
import { createContact, createContactSchema } from './tools/create-contact.js';
import { enrichEmail, enrichEmailSchema } from './tools/enrich-email.js';

const server = new Server(
  {
    name: 'clay-crm-mcp-server',
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
    name: 'clay_search_contacts',
    description: 'Search for contacts in Clay CRM by name, company, notes, or any other text',
    inputSchema: searchContactsSchema,
  },
  {
    name: 'clay_get_contact',
    description: 'Get detailed information about a specific contact by their ID',
    inputSchema: getContactSchema,
  },
  {
    name: 'clay_get_contacts_bulk',
    description: 'Get information for multiple contacts at once by their IDs',
    inputSchema: getContactsBulkSchema,
  },
  {
    name: 'clay_get_activity',
    description: 'Get activity feed with social posts, news, events, and updates from your contacts',
    inputSchema: getActivitySchema,
  },
  {
    name: 'clay_get_timeline',
    description: 'Get the interaction timeline and history for a specific contact',
    inputSchema: getTimelineSchema,
  },
  {
    name: 'clay_add_note',
    description: 'Add a note to a contact in Clay',
    inputSchema: addNoteSchema,
  },
  {
    name: 'clay_create_contact',
    description: 'Create a new contact in Clay from an email, social URL, phone, or name',
    inputSchema: createContactSchema,
  },
  {
    name: 'clay_enrich_email',
    description: 'Look up profile information for an email address including name, bio, location, and social links',
    inputSchema: enrichEmailSchema,
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
      case 'clay_search_contacts':
        result = await searchContacts(args as unknown as Parameters<typeof searchContacts>[0]);
        break;
      case 'clay_get_contact':
        result = await getContact(args as unknown as Parameters<typeof getContact>[0]);
        break;
      case 'clay_get_contacts_bulk':
        result = await getContactsBulk(args as unknown as Parameters<typeof getContactsBulk>[0]);
        break;
      case 'clay_get_activity':
        result = await getActivity(args as unknown as Parameters<typeof getActivity>[0]);
        break;
      case 'clay_get_timeline':
        result = await getTimeline(args as unknown as Parameters<typeof getTimeline>[0]);
        break;
      case 'clay_add_note':
        result = await addNote(args as unknown as Parameters<typeof addNote>[0]);
        break;
      case 'clay_create_contact':
        result = await createContact(args as unknown as Parameters<typeof createContact>[0]);
        break;
      case 'clay_enrich_email':
        result = await enrichEmail(args as unknown as Parameters<typeof enrichEmail>[0]);
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
  console.error('Clay CRM MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
