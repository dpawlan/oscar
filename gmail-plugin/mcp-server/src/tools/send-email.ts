import { getGmailClient } from '../gmail-client.js';
import { gmail_v1 } from 'googleapis';

export interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyToMessageId?: string;
}

export async function sendEmail(args: SendEmailArgs): Promise<string> {
  const gmail = await getGmailClient();

  // Build RFC 2822 formatted email
  const emailLines = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (args.cc) emailLines.splice(1, 0, `Cc: ${args.cc}`);
  if (args.bcc) emailLines.splice(1, 0, `Bcc: ${args.bcc}`);

  emailLines.push('', args.body);

  const rawMessage = Buffer.from(emailLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const requestBody: gmail_v1.Schema$Message = { raw: rawMessage };

  // If replying, get thread ID from original message
  if (args.replyToMessageId) {
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: args.replyToMessageId,
      format: 'minimal',
    });
    requestBody.threadId = original.data.threadId!;
  }

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody,
  });

  return JSON.stringify({
    success: true,
    messageId: response.data.id,
    threadId: response.data.threadId,
    message: `Email sent successfully to ${args.to}`,
  });
}

export const sendEmailSchema = {
  type: 'object' as const,
  properties: {
    to: {
      type: 'string',
      description: 'Recipient email address',
    },
    subject: {
      type: 'string',
      description: 'Email subject line',
    },
    body: {
      type: 'string',
      description: 'Email body content (plain text)',
    },
    cc: {
      type: 'string',
      description: 'CC recipients (comma-separated)',
    },
    bcc: {
      type: 'string',
      description: 'BCC recipients (comma-separated)',
    },
    replyToMessageId: {
      type: 'string',
      description: 'Message ID to reply to (for threading)',
    },
  },
  required: ['to', 'subject', 'body'],
};
