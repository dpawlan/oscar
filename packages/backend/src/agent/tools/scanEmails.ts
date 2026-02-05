import { z } from 'zod';
import { gmail_v1 } from 'googleapis';
import { extractEmailBody, extractEmailHeaders } from './utils/emailUtils.js';

export const scanEmailsSchema = {
  folder: z.enum(['inbox', 'sent', 'all', 'drafts', 'trash', 'spam']).default('all')
    .describe('Which folder to scan: inbox, sent, all (everywhere), drafts, trash, spam'),
  maxResults: z.number().min(1).max(50).default(20)
    .describe('Number of emails to scan (max 50)'),
  newerThanDays: z.number().min(1).max(365).optional()
    .describe('Only scan emails from the last N days'),
  pageToken: z.string().optional()
    .describe('Token to fetch next page of results'),
};

export type ScanEmailsInput = z.infer<z.ZodObject<typeof scanEmailsSchema>>;

export async function scanEmails(
  gmail: gmail_v1.Gmail,
  args: ScanEmailsInput
): Promise<string> {
  // Build query based on folder
  let query = '';
  switch (args.folder) {
    case 'inbox':
      query = 'in:inbox';
      break;
    case 'sent':
      query = 'in:sent';
      break;
    case 'drafts':
      query = 'in:drafts';
      break;
    case 'trash':
      query = 'in:trash';
      break;
    case 'spam':
      query = 'in:spam';
      break;
    case 'all':
    default:
      query = 'in:anywhere';
      break;
  }

  // Add date filter if specified
  if (args.newerThanDays) {
    query += ` newer_than:${args.newerThanDays}d`;
  }

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: args.maxResults,
    q: query,
    pageToken: args.pageToken,
  });

  const messages = response.data.messages || [];

  // Fetch FULL content for each message
  const emails = await Promise.all(
    messages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const headers = extractEmailHeaders(full.data.payload?.headers);
      const body = extractEmailBody(full.data.payload);

      return {
        id: msg.id,
        threadId: full.data.threadId,
        subject: headers.subject || '(no subject)',
        from: headers.from || 'Unknown',
        to: headers.to,
        date: headers.date,
        labels: full.data.labelIds,
        body: body.substring(0, 5000), // Limit each body to 5k chars
      };
    })
  );

  return JSON.stringify({
    folder: args.folder,
    query,
    count: emails.length,
    nextPageToken: response.data.nextPageToken || null,
    emails,
  }, null, 2);
}
