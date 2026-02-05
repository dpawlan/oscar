import { config as loadEnv } from 'dotenv';

// Load .env with override to handle pre-existing env vars
loadEnv({ override: true });

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',

  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || '',
  CLAY_API_KEY: process.env.CLAY_API_KEY || '',
} as const;

// Validate required config (ANTHROPIC_API_KEY no longer needed - Agent SDK handles auth)
const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY'] as const;

export function validateConfig(): void {
  const missing = required.filter(key => !config[key]);
  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Copy .env.example to .env and fill in the values');
  }
}
