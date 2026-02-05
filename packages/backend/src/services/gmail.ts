import { google, gmail_v1, drive_v3, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { config } from '../config/index.js';
import { getTokens, saveTokens, getGmailAccounts } from './tokenStore.js';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );
}

/**
 * Creates an OAuth2 client with token refresh handling for a specific account.
 */
function createAuthenticatedClient(
  userId: string,
  email: string,
  tokens: Credentials
): OAuth2Client {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Handle automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    const existingTokens = await getTokens(userId, email);
    await saveTokens(userId, {
      ...existingTokens,
      ...newTokens,
    });
  });

  return oauth2Client;
}

/**
 * Generic factory for creating Google API clients for all connected accounts.
 */
async function getAllClients<T>(
  userId: string,
  createClient: (auth: OAuth2Client) => T,
  serviceName: string
): Promise<{ email: string; client: T }[]> {
  const accounts = await getGmailAccounts(userId);
  if (accounts.length === 0) {
    throw new Error(`User not authenticated with ${serviceName}`);
  }

  return accounts.map((account) => {
    const oauth2Client = createAuthenticatedClient(userId, account.email, account.tokens);
    return {
      email: account.email,
      client: createClient(oauth2Client),
    };
  });
}

// Single account Gmail client (for backwards compatibility)
export async function getGmailClient(userId: string, email?: string): Promise<gmail_v1.Gmail> {
  const tokens = await getTokens(userId, email);
  if (!tokens) {
    throw new Error('User not authenticated with Gmail');
  }

  const oauth2Client = createAuthenticatedClient(userId, email || '', tokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Multi-account clients
export async function getAllGmailClients(userId: string): Promise<{ email: string; client: gmail_v1.Gmail }[]> {
  return getAllClients(userId, (auth) => google.gmail({ version: 'v1', auth }), 'Gmail');
}

export async function getAllDriveClients(userId: string): Promise<{ email: string; client: drive_v3.Drive }[]> {
  return getAllClients(userId, (auth) => google.drive({ version: 'v3', auth }), 'Google Drive');
}

export async function getAllCalendarClients(userId: string): Promise<{ email: string; client: calendar_v3.Calendar }[]> {
  return getAllClients(userId, (auth) => google.calendar({ version: 'v3', auth }), 'Google Calendar');
}
