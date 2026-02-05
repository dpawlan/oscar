import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import open from 'open';
import http from 'http';
import { URL } from 'url';
import { UnifiedMessage, SearchResult } from './types.js';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_DIR = join(homedir(), '.oscar-mcp');
const TOKEN_PATH = join(TOKEN_DIR, 'gmail-token.json');

let oauth2Client: OAuth2Client | null = null;
let gmailClient: gmail_v1.Gmail | null = null;

// ============ Authentication ============

async function getAuthenticatedClient(): Promise<OAuth2Client> {
  if (oauth2Client) return oauth2Client;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
  }

  oauth2Client = new OAuth2Client(clientId, clientSecret, 'http://localhost:3847/oauth2callback');

  if (existsSync(TOKEN_PATH)) {
    const tokenData = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(tokenData);

    if (tokenData.expiry_date && tokenData.expiry_date < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
      } catch {
        await performOAuthFlow(oauth2Client);
      }
    }
  } else {
    await performOAuthFlow(oauth2Client);
  }

  return oauth2Client;
}

async function performOAuthFlow(client: OAuth2Client): Promise<void> {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.error('Opening browser for Gmail authentication...');

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://localhost:3847');
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>');
          server.close();
          resolve(code);
        }
      } catch (err) {
        reject(err);
      }
    });

    server.listen(3847, () => {
      open(authUrl);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout'));
    }, 120000);
  });

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (!existsSync(TOKEN_DIR)) {
    mkdirSync(TOKEN_DIR, { recursive: true });
  }
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
}

async function getGmailClient(): Promise<gmail_v1.Gmail> {
  if (!gmailClient) {
    const auth = await getAuthenticatedClient();
    gmailClient = google.gmail({ version: 'v1', auth });
  }
  return gmailClient;
}

// ============ Helper Functions ============

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }

  if (payload.parts) {
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf8');
    }

    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf8');
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
}

// ============ Search Functions ============

export interface GmailSearchOptions {
  query?: string;
  contact?: string;
  daysBack?: number;
  maxResults?: number;
  includeBody?: boolean;
}

export async function searchGmail(options: GmailSearchOptions): Promise<SearchResult[]> {
  const gmail = await getGmailClient();
  const maxResults = Math.min(options.maxResults || 20, 100);

  // Build Gmail query
  let gmailQuery = options.query || '';

  if (options.contact) {
    // Search both from and to
    const contactQuery = `(from:${options.contact} OR to:${options.contact})`;
    gmailQuery = gmailQuery ? `${gmailQuery} ${contactQuery}` : contactQuery;
  }

  if (options.daysBack) {
    const cutoff = new Date(Date.now() - options.daysBack * 24 * 60 * 60 * 1000);
    const dateStr = cutoff.toISOString().split('T')[0].replace(/-/g, '/');
    gmailQuery = gmailQuery ? `${gmailQuery} after:${dateStr}` : `after:${dateStr}`;
  }

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: gmailQuery || undefined,
    maxResults,
  });

  const messages = response.data.messages || [];
  const results: SearchResult[] = [];

  for (const msg of messages) {
    const format = options.includeBody ? 'full' : 'metadata';
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format,
      metadataHeaders: ['Subject', 'From', 'To', 'Date'],
    });

    const headers = full.data.payload?.headers || [];
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const dateStr = getHeader(headers, 'Date');
    const date = dateStr ? new Date(dateStr) : new Date();

    // Determine if sent by user
    const userEmail = await getUserEmail();
    const isFromMe = from.toLowerCase().includes(userEmail.toLowerCase());

    let body = full.data.snippet || '';
    if (options.includeBody && full.data.payload) {
      body = extractBody(full.data.payload) || body;
    }

    const message: UnifiedMessage = {
      id: msg.id!,
      source: 'gmail',
      text: body,
      date: date.toISOString(),
      isFromMe,
      sender: from,
      recipient: to,
      subject,
      threadId: full.data.threadId || undefined,
      contact: null, // Would need to resolve
      metadata: {
        snippet: full.data.snippet,
        labelIds: full.data.labelIds,
      },
    };

    results.push({ message });
  }

  return results;
}

let userEmail: string | null = null;

async function getUserEmail(): Promise<string> {
  if (userEmail) return userEmail;

  const gmail = await getGmailClient();
  const profile = await gmail.users.getProfile({ userId: 'me' });
  userEmail = profile.data.emailAddress || '';
  return userEmail;
}

// ============ Thread Context ============

export async function getEmailThread(threadId: string): Promise<UnifiedMessage[]> {
  const gmail = await getGmailClient();

  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages: UnifiedMessage[] = [];
  const user = await getUserEmail();

  for (const msg of thread.data.messages || []) {
    const headers = msg.payload?.headers || [];
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const dateStr = getHeader(headers, 'Date');
    const date = dateStr ? new Date(dateStr) : new Date();

    const body = extractBody(msg.payload) || msg.snippet || '';
    const isFromMe = from.toLowerCase().includes(user.toLowerCase());

    messages.push({
      id: msg.id!,
      source: 'gmail',
      text: body,
      date: date.toISOString(),
      isFromMe,
      sender: from,
      recipient: to,
      subject,
      threadId,
      contact: null,
    });
  }

  return messages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ============ Nickname Inference ============

export interface GmailNicknameMatch {
  email: string;
  name: string | null;
  count: number;
  examples: Array<{ subject: string; date: string }>;
}

export async function inferNicknameFromGmail(nickname: string): Promise<GmailNicknameMatch[]> {
  const gmail = await getGmailClient();

  // Search for emails where user mentions the nickname
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: nickname,
    maxResults: 100,
  });

  const messages = response.data.messages || [];
  const emailCounts = new Map<string, GmailNicknameMatch>();

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date'],
    });

    const headers = full.data.payload?.headers || [];
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'To');
    const subject = getHeader(headers, 'Subject');
    const dateStr = getHeader(headers, 'Date');

    // Extract email addresses
    const emails = [...(from.match(/[\w.-]+@[\w.-]+/g) || []), ...(to.match(/[\w.-]+@[\w.-]+/g) || [])];

    for (const email of emails) {
      const emailLower = email.toLowerCase();
      if (!emailCounts.has(emailLower)) {
        // Extract name from "Name <email>" format
        const nameMatch = from.match(/^([^<]+)</);
        emailCounts.set(emailLower, {
          email: emailLower,
          name: nameMatch ? nameMatch[1].trim() : null,
          count: 0,
          examples: [],
        });
      }

      const entry = emailCounts.get(emailLower)!;
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push({
          subject,
          date: dateStr,
        });
      }
    }
  }

  return Array.from(emailCounts.values()).sort((a, b) => b.count - a.count);
}
