import { Router } from 'express';
import { google } from 'googleapis';
import { config } from '../config/index.js';
import { createOAuth2Client, GMAIL_SCOPES } from '../services/gmail.js';
import { saveGmailAccount, getGmailAccounts, removeGmailAccount, deleteTokens, getTokens } from '../services/tokenStore.js';

const router = Router();

// Initiate OAuth flow
router.get('/google', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    state: userId,
    prompt: 'consent', // Force consent to get refresh token
  });

  res.redirect(authUrl);
});

// OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(`${config.FRONTEND_URL}?auth=error&message=${encodeURIComponent(error as string)}`);
  }

  if (!code || !userId) {
    return res.redirect(`${config.FRONTEND_URL}?auth=error&message=missing_params`);
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);

    // Set credentials to fetch user email
    oauth2Client.setCredentials(tokens);

    // Get user's email address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'unknown@gmail.com';

    // Save with email
    await saveGmailAccount(userId as string, email, tokens);

    res.redirect(`${config.FRONTEND_URL}?auth=success&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error('Token exchange error:', err);
    res.redirect(`${config.FRONTEND_URL}?auth=error&message=token_exchange_failed`);
  }
});

// Check auth status - returns list of connected accounts
router.get('/status/:userId', async (req, res) => {
  const accounts = await getGmailAccounts(req.params.userId);
  res.json({
    authenticated: accounts.length > 0,
    accounts: accounts.map(acc => ({
      email: acc.email,
      connectedAt: acc.connectedAt,
    })),
  });
});

// Disconnect a specific Gmail account
router.post('/disconnect/:userId', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const tokens = await getTokens(req.params.userId, email);
  if (tokens?.access_token) {
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(tokens.access_token);
    } catch {
      // Token may already be invalid
    }
  }

  await removeGmailAccount(req.params.userId, email);
  res.json({ success: true });
});

// Logout - disconnect all accounts
router.post('/logout/:userId', async (req, res) => {
  const accounts = await getGmailAccounts(req.params.userId);

  // Revoke all tokens
  for (const account of accounts) {
    if (account.tokens.access_token) {
      try {
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(account.tokens.access_token);
      } catch {
        // Token may already be invalid
      }
    }
  }

  await deleteTokens(req.params.userId);
  res.json({ success: true });
});

export { router as authRouter };
