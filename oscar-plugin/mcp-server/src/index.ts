#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { search, searchSchema, SearchArgs } from './tools/search.js';
import { resolveContact, resolveContactSchema, ResolveContactArgs } from './tools/resolve-contact.js';
import { getContext, getContextSchema, GetContextArgs } from './tools/get-context.js';

const server = new Server(
  {
    name: 'oscar-mcp-server',
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
    name: 'oscar_search',
    description: `Search across Gmail and iMessage with full conversation context. Features:
- Searches both email and text messages simultaneously
- Automatically resolves nicknames/aliases (e.g., "Mandy" → Matt Mandelbaum)
- Returns surrounding messages for context (not just the match)
- Filters by contact, time period, or specific source

Use this when looking for information that might be in emails or texts.
Examples: "apartment Mandy", "flight confirmation", "dinner plans John"`,
    inputSchema: searchSchema,
  },
  {
    name: 'oscar_resolve_contact',
    description: `Figure out who someone is by their nickname, alias, or informal name. Searches:
- macOS Contacts for direct matches
- Clay CRM notes for nickname mentions
- iMessage history for patterns (who do you call "Mandy"?)
- Gmail for email patterns

Use this when you need to identify who a nickname refers to before searching.
Examples: "Mandy", "Mom", "Big J", "the investor guy"`,
    inputSchema: resolveContactSchema,
  },
  {
    name: 'oscar_get_context',
    description: `Get full conversation history with a contact from a specific source. Features:
- Can center around a keyword (find where "apartment" was discussed)
- Returns messages in chronological order
- Automatically resolves nicknames

Use this when you need to read through a conversation, not just find a specific message.
Examples: Get iMessage history with "Mom" around "birthday", Get Gmail threads with "John" about "project"`,
    inputSchema: getContextSchema,
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
      case 'oscar_search':
        result = await search(args as unknown as SearchArgs);
        break;
      case 'oscar_resolve_contact':
        result = await resolveContact(args as unknown as ResolveContactArgs);
        break;
      case 'oscar_get_context':
        result = await getContext(args as unknown as GetContextArgs);
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
  console.error('Oscar unified MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
