import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Credentials } from 'google-auth-library';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_DIR = path.resolve(__dirname, '../../../../.tokens');

export interface GmailAccount {
  email: string;
  tokens: Credentials;
  connectedAt: string;
}

export interface UserTokenData {
  gmailAccounts: GmailAccount[];
}

function getEncryptionKey(): Buffer {
  const key = config.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }
  return Buffer.from(key, 'hex');
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getUserData(userId: string): Promise<UserTokenData> {
  try {
    const filePath = path.join(TOKEN_DIR, `${userId}.token`);
    const encrypted = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(decrypt(encrypted));
    // Handle migration from old format (single token) to new format (multiple accounts)
    if (data.access_token || data.refresh_token) {
      // Old format - migrate to new format
      return {
        gmailAccounts: [{
          email: 'unknown@gmail.com', // Will be updated on next auth
          tokens: data,
          connectedAt: new Date().toISOString(),
        }],
      };
    }
    return data;
  } catch {
    return { gmailAccounts: [] };
  }
}

async function saveUserData(userId: string, data: UserTokenData): Promise<void> {
  await fs.mkdir(TOKEN_DIR, { recursive: true });
  const encrypted = encrypt(JSON.stringify(data));
  const filePath = path.join(TOKEN_DIR, `${userId}.token`);
  await fs.writeFile(filePath, encrypted);
}

// Add or update a Gmail account
export async function saveGmailAccount(userId: string, email: string, tokens: Credentials): Promise<void> {
  const userData = await getUserData(userId);
  const existingIndex = userData.gmailAccounts.findIndex(acc => acc.email === email);

  const account: GmailAccount = {
    email,
    tokens,
    connectedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    userData.gmailAccounts[existingIndex] = account;
  } else {
    userData.gmailAccounts.push(account);
  }

  await saveUserData(userId, userData);
}

// Get all Gmail accounts for a user
export async function getGmailAccounts(userId: string): Promise<GmailAccount[]> {
  const userData = await getUserData(userId);
  return userData.gmailAccounts;
}

// Get tokens for a specific email or first account if no email specified
export async function getTokens(userId: string, email?: string): Promise<Credentials | null> {
  const userData = await getUserData(userId);
  if (userData.gmailAccounts.length === 0) return null;

  if (email) {
    const account = userData.gmailAccounts.find(acc => acc.email === email);
    return account?.tokens || null;
  }

  // Return first account's tokens for backwards compatibility
  return userData.gmailAccounts[0]?.tokens || null;
}

// Remove a specific Gmail account
export async function removeGmailAccount(userId: string, email: string): Promise<void> {
  const userData = await getUserData(userId);
  userData.gmailAccounts = userData.gmailAccounts.filter(acc => acc.email !== email);
  await saveUserData(userId, userData);
}

// Remove all Gmail accounts (full logout)
export async function deleteTokens(userId: string): Promise<void> {
  const filePath = path.join(TOKEN_DIR, `${userId}.token`);
  await fs.unlink(filePath).catch(() => {});
}

// Legacy function for backwards compatibility
export async function saveTokens(userId: string, tokens: Credentials): Promise<void> {
  // This will be called with email from the callback
  // For now, save as unknown - will be updated by callback with actual email
  await saveGmailAccount(userId, 'pending@gmail.com', tokens);
}
