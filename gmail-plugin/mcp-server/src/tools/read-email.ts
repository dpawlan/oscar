import { getGmailClient, extractBody, getHeader } from '../gmail-client.js';

export interface ReadEmailArgs {
  emailId: string;
}

export async function readEmail(args: ReadEmailArgs): Promise<string> {
  const gmail = await getGmailClient();

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: args.emailId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload?.headers || [];
  const body = extractBody(message.payload);

  return JSON.stringify({
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    cc: getHeader(headers, 'Cc'),
    date: getHeader(headers, 'Date'),
    labels: message.labelIds,
    body: body.substring(0, 15000), // Limit body size
  }, null, 2);
}

export const readEmailSchema = {
  type: 'object' as const,
  properties: {
    emailId: {
      type: 'string',
      description: 'The unique ID of the email to read',
    },
  },
  required: ['emailId'],
};
