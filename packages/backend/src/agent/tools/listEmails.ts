import { z } from 'zod';
import { gmail_v1 } from 'googleapis';

export const listEmailsSchema = {
  maxResults: z.number().min(1).max(100).default(10)
    .describe('Maximum number of emails to return'),
  labelIds: z.array(z.string()).optional()
    .describe('Filter by label IDs (e.g., ["INBOX", "UNREAD"])'),
  query: z.string().optional()
    .describe('Gmail search query (e.g., "is:unread from:john@example.com")'),
};

export type ListEmailsInput = z.infer<z.ZodObject<typeof listEmailsSchema>>;

export async function listEmails(
  gmail: gmail_v1.Gmail,
  args: ListEmailsInput
): Promise<string> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: args.maxResults,
    labelIds: args.labelIds,
    q: args.query,
  });

  const messages = response.data.messages || [];

  // Fetch metadata for each message
  const emailSummaries = await Promise.all(
    messages.slice(0, args.maxResults).map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });
      const headers = full.data.payload?.headers || [];
      return {
        id: msg.id,
        subject: headers.find(h => h.name === 'Subject')?.value || '(no subject)',
        from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        date: headers.find(h => h.name === 'Date')?.value,
        snippet: full.data.snippet,
      };
    })
  );

  return JSON.stringify({
    count: messages.length,
    emails: emailSummaries,
  }, null, 2);
}
