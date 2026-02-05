import { z } from 'zod';
import { gmail_v1 } from 'googleapis';

export const searchEmailsSchema = {
  query: z.string().describe(
    'Gmail search query. Examples: "from:john@example.com", "subject:meeting", ' +
    '"is:unread after:2024/01/01", "has:attachment filename:pdf"'
  ),
  maxResults: z.number().min(1).max(50).default(20)
    .describe('Maximum number of results'),
};

export type SearchEmailsInput = z.infer<z.ZodObject<typeof searchEmailsSchema>>;

export async function searchEmails(
  gmail: gmail_v1.Gmail,
  args: SearchEmailsInput
): Promise<string> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: args.query,
    maxResults: args.maxResults,
  });

  const messages = response.data.messages || [];

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
        subject: headers.find(h => h.name === 'Subject')?.value,
        from: headers.find(h => h.name === 'From')?.value,
        date: headers.find(h => h.name === 'Date')?.value,
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
