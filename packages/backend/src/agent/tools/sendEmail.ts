import { z } from 'zod';
import { gmail_v1 } from 'googleapis';

export const sendEmailSchema = {
  to: z.string().describe('Recipient email address'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content (plain text)'),
  cc: z.string().optional().describe('CC recipients (comma-separated)'),
  bcc: z.string().optional().describe('BCC recipients (comma-separated)'),
  replyToMessageId: z.string().optional()
    .describe('Message ID to reply to (for threading)'),
};

export type SendEmailInput = z.infer<z.ZodObject<typeof sendEmailSchema>>;

export async function sendEmail(
  gmail: gmail_v1.Gmail,
  args: SendEmailInput
): Promise<string> {
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
  });
}
