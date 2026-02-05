import { google, gmail_v1 } from 'googleapis';
import { getAuthenticatedClient } from './auth.js';

let gmailClient: gmail_v1.Gmail | null = null;

export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  if (!gmailClient) {
    const auth = await getAuthenticatedClient();
    gmailClient = google.gmail({ version: 'v1', auth });
  }
  return gmailClient;
}

export function resetClient(): void {
  gmailClient = null;
}

// Helper to extract email body from message payload
export function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }

  if (payload.parts) {
    // Prefer plain text
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf8');
    }

    // Fall back to HTML (strip tags)
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Recursively check nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
}

// Helper to get header value
export function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}
