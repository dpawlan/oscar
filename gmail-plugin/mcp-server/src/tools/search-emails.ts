import { getGmailClient, getHeader } from '../gmail-client.js';

export interface SearchEmailsArgs {
  query: string;
  maxResults?: number;
}

export async function searchEmails(args: SearchEmailsArgs): Promise<string> {
  const gmail = await getGmailClient();
  const maxResults = Math.min(args.maxResults || 20, 50);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: args.query,
    maxResults,
  });

  const messages = response.data.messages || [];

  if (messages.length === 0) {
    return JSON.stringify({
      query: args.query,
      totalResults: 0,
      results: [],
      message: 'No emails found matching query',
    });
  }

  const results = await Promise.all(
    messages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = full.data.payload?.headers || [];

      return {
        id: msg.id,
        subject: getHeader(headers, 'Subject'),
        from: getHeader(headers, 'From'),
        date: getHeader(headers, 'Date'),
        snippet: full.data.snippet,
      };
    })
  );

  return JSON.stringify({
    query: args.query,
    totalResults: messages.length,
    results,
  }, null, 2);
}

export const searchEmailsSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Gmail search query (e.g., "from:example@gmail.com is:unread newer_than:7d")',
    },
    maxResults: {
      type: 'number',
      description: 'Maximum number of results (default: 20, max: 50)',
    },
  },
  required: ['query'],
};
