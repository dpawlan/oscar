import { getGmailClient, getHeader } from '../gmail-client.js';

export interface ListEmailsArgs {
  maxResults?: number;
  query?: string;
  labelIds?: string[];
}

export async function listEmails(args: ListEmailsArgs): Promise<string> {
  const gmail = await getGmailClient();
  const maxResults = Math.min(args.maxResults || 10, 100);

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: args.query,
    labelIds: args.labelIds,
  });

  const messages = response.data.messages || [];

  if (messages.length === 0) {
    return JSON.stringify({ count: 0, emails: [], message: 'No emails found' });
  }

  const emailSummaries = await Promise.all(
    messages.slice(0, maxResults).map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = full.data.payload?.headers || [];
      const labelIds = full.data.labelIds || [];

      return {
        id: msg.id,
        subject: getHeader(headers, 'Subject') || '(no subject)',
        from: getHeader(headers, 'From') || 'Unknown',
        date: getHeader(headers, 'Date'),
        snippet: full.data.snippet,
        isUnread: labelIds.includes('UNREAD'),
        labels: labelIds,
      };
    })
  );

  return JSON.stringify({
    count: messages.length,
    emails: emailSummaries,
  }, null, 2);
}

export const listEmailsSchema = {
  type: 'object' as const,
  properties: {
    maxResults: {
      type: 'number',
      description: 'Maximum number of emails to return (default: 10, max: 100)',
    },
    query: {
      type: 'string',
      description: 'Gmail search query (e.g., "is:unread from:example@gmail.com")',
    },
    labelIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Filter by label IDs (e.g., ["INBOX", "UNREAD"])',
    },
  },
};
