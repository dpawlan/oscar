import { z } from 'zod';
import { gmail_v1 } from 'googleapis';
import { extractEmailBody, extractEmailHeaders } from './utils/emailUtils.js';

export const readEmailSchema = {
  emailId: z.string().describe('The unique ID of the email to read'),
};

export type ReadEmailInput = z.infer<z.ZodObject<typeof readEmailSchema>>;

export async function readEmail(
  gmail: gmail_v1.Gmail,
  args: ReadEmailInput
): Promise<string> {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: args.emailId,
    format: 'full',
  });

  const message = response.data;
  const headers = extractEmailHeaders(message.payload?.headers);
  const body = extractEmailBody(message.payload);

  return JSON.stringify({
    id: message.id,
    threadId: message.threadId,
    ...headers,
    labels: message.labelIds,
    body: body.substring(0, 10000), // Limit body size
  }, null, 2);
}
