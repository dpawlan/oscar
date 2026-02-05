import { OAuth2Client } from 'google-auth-library';
import { Credentials } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import open from 'open';
import http from 'http';

const CONFIG_DIR = path.join(os.homedir(), '.gmail-mcp');
const CREDENTIALS_PATH = path.join(CONFIG_DIR, 'credentials.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
];

interface StoredCredentials {
  client_id: string;
  client_secret: string;
  redirect_uri?: string;
}

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveToken(token: Credentials): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2));
}

async function loadToken(): Promise<Credentials | null> {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getAuthorizationCode(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:3456`);
        const code = url.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1>Authentication Successful!</h1>
                  <p>You can close this window and return to Claude Code.</p>
                </div>
              </body>
            </html>
          `);
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing authorization code');
        }
      } catch (error) {
        reject(error);
      }
    });

    server.listen(3456, () => {
      console.error('Opening browser for Google authentication...');
      open(authUrl);
    });

    server.on('error', reject);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out'));
    }, 300000);
  });
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const credentials = await loadCredentials();

  if (!credentials) {
    throw new Error(
      `Gmail credentials not found. Please create ${CREDENTIALS_PATH} with your Google OAuth credentials:\n` +
      `{\n  "client_id": "your-client-id.apps.googleusercontent.com",\n  "client_secret": "your-client-secret"\n}`
    );
  }

  const oauth2Client = new OAuth2Client(
    credentials.client_id,
    credentials.client_secret,
    'http://localhost:3456'
  );

  const token = await loadToken();

  if (token) {
    oauth2Client.setCredentials(token);

    // Check if token is expired or will expire soon
    if (token.expiry_date && token.expiry_date < Date.now() + 60000) {
      if (token.refresh_token) {
        try {
          const { credentials: newToken } = await oauth2Client.refreshAccessToken();
          await saveToken(newToken);
          oauth2Client.setCredentials(newToken);
        } catch {
          // Refresh failed, need to re-authenticate
          const newToken = await authenticateUser(oauth2Client);
          oauth2Client.setCredentials(newToken);
        }
      }
    }

    return oauth2Client;
  }

  // No token, need to authenticate
  const newToken = await authenticateUser(oauth2Client);
  oauth2Client.setCredentials(newToken);
  return oauth2Client;
}

async function authenticateUser(oauth2Client: OAuth2Client): Promise<Credentials> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  const code = await getAuthorizationCode(authUrl);
  const { tokens } = await oauth2Client.getToken(code);
  await saveToken(tokens);
  return tokens;
}

export async function setupCredentials(clientId: string, clientSecret: string): Promise<void> {
  await ensureConfigDir();
  const credentials: StoredCredentials = {
    client_id: clientId,
    client_secret: clientSecret,
  };
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

export { CONFIG_DIR, CREDENTIALS_PATH, TOKEN_PATH };
