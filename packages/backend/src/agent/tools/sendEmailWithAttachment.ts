import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { getAllGmailClients, getAllDriveClients } from '../../services/gmail.js';

const sendEmailWithAttachmentSchema = {
  to: z.string().describe('Recipient email address'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content'),
  driveFileId: z.string().describe('The Google Drive file ID to attach (get this from list_drive_files)'),
  fromAccount: z.string().optional().describe('Which connected account to send from (email address)'),
};

export const sendEmailWithAttachmentTool = (userId: string) => tool(
  'send_email_with_attachment',
  `Send an email with a file attachment from Google Drive. Use this when the user wants to send an email AND attach a file from their Drive. You must first use list_drive_files to find the file ID, then use this tool with that ID. Always confirm the recipient, subject, content, and attachment filename with the user before sending.`,
  sendEmailWithAttachmentSchema,
  async (args) => {
    try {
      const { to, subject, body, driveFileId, fromAccount } = args as {
        to: string;
        subject: string;
        body: string;
        driveFileId: string;
        fromAccount?: string;
      };

      const gmailClients = await getAllGmailClients(userId);
      const driveClients = await getAllDriveClients(userId);

      if (gmailClients.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Gmail accounts connected. Please connect your Gmail first.' }) }], isError: true };
      }

      // Find the Gmail client to send from
      const gmailClient = fromAccount
        ? gmailClients.find(c => c.email === fromAccount)
        : gmailClients[0];

      if (!gmailClient) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `Gmail account ${fromAccount} not found.` }) }], isError: true };
      }

      // Find the Drive client (use same account or first available)
      const driveClient = driveClients.find(c => c.email === gmailClient.email) || driveClients[0];

      if (!driveClient) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Google Drive access. Please reconnect your account.' }) }], isError: true };
      }

      // Get file metadata
      const fileMetadata = await driveClient.client.files.get({
        fileId: driveFileId,
        fields: 'name, mimeType',
      });

      const fileName = fileMetadata.data.name || 'attachment';
      let mimeType = fileMetadata.data.mimeType || 'application/octet-stream';

      // Download the file content
      let fileContent: Buffer;

      // Check if it's a Google Workspace file that needs to be exported
      const exportMimeTypes: Record<string, string> = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/pdf',
      };

      if (exportMimeTypes[mimeType]) {
        // Export Google Workspace files as PDF
        const exportResponse = await driveClient.client.files.export({
          fileId: driveFileId,
          mimeType: exportMimeTypes[mimeType],
        }, {
          responseType: 'arraybuffer',
        });
        fileContent = Buffer.from(exportResponse.data as ArrayBuffer);
        mimeType = exportMimeTypes[mimeType];
      } else {
        // Download regular files
        const downloadResponse = await driveClient.client.files.get({
          fileId: driveFileId,
          alt: 'media',
        }, {
          responseType: 'arraybuffer',
        });
        fileContent = Buffer.from(downloadResponse.data as ArrayBuffer);
      }

      const base64File = fileContent.toString('base64');

      // Determine the attachment filename
      let attachmentName = fileName;
      if (exportMimeTypes[fileMetadata.data.mimeType || ''] && !fileName.endsWith('.pdf')) {
        attachmentName = fileName + '.pdf';
      }

      // Build MIME message
      const boundary = `===BOUNDARY_${Date.now()}===`;
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body,
        '',
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${attachmentName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachmentName}"`,
        '',
        base64File,
        `--${boundary}--`,
      ].join('\r\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmailClient.client.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      const result = {
        success: true,
        message: `Email sent to ${to} with attachment: ${attachmentName}`,
        to,
        subject,
        attachment: attachmentName,
        sentFrom: gmailClient.email,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      console.error('Send email with attachment error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { content: [{ type: 'text' as const, text: `Error: Failed to send email with attachment: ${errorMsg}` }], isError: true };
    }
  }
);
