# Building Your First AI Agent

**A step-by-step journey from chatbot to agent**

---

## How to Use This Guide

This isn't a code dump. It's a guided journey.

Each chapter walks you through **what we're building**, **why we're building it that way**, and **how to verify it's working** before moving on. Think of it like a playlist - each chapter builds on the last, and you shouldn't skip ahead until you've validated the current step.

We'll build a working AI agent called "Oscar" that manages emails. But Oscar is just the example - the patterns you learn apply to any agent you want to build. By the end, you'll understand how to create agents that connect to any API, any service, any workflow.

**Important:** What we build here is a foundation, not a finished product. Your agent will need iteration - tweaking the personality, refining the tools, customizing the design. That's expected. This guide gets you to a working starting point.

Take your time. Understanding *why* is more important than copying code.

---

## Table of Contents

1. [Chapter 1: What Are AI Agents?](#chapter-1-what-are-ai-agents)
2. [Chapter 2: Setting Up Your Foundation](#chapter-2-setting-up-your-foundation)
3. [Chapter 3: The Agent Loop](#chapter-3-the-agent-loop)
4. [Chapter 4: Giving Your Agent Tools](#chapter-4-giving-your-agent-tools)
5. [Chapter 5: Connecting to External Services](#chapter-5-connecting-to-external-services)
6. [Chapter 6: Building the Interface](#chapter-6-building-the-interface)
7. [Chapter 7: Streaming & Real-time UX](#chapter-7-streaming--real-time-ux)
8. [Chapter 8: Making It Yours](#chapter-8-making-it-yours)
9. [Chapter 9: Where to Go From Here](#chapter-9-where-to-go-from-here)

---

# Chapter 1: What Are AI Agents?

> **Video Note:** This chapter works well as a 5-7 minute conceptual intro. Start with a demo of an agent in action, then explain what makes it different from a chatbot. Visual: Side-by-side comparison of chatbot vs agent interaction.

## The Difference That Matters

**A chatbot responds. An agent acts.**

Here's a chatbot interaction:
```
You: "What's 2+2?"
Bot: "4"
```

Here's an agent interaction:
```
You: "What emails did I get today?"
Agent: [decides to use list_emails tool]
Agent: [executes tool, fetches your actual emails]
Agent: "You have 5 emails today. The most important one is from Sarah about the project deadline..."
```

The chatbot answered from knowledge. The agent *did something* - it made a decision, took an action, and used the result to respond.

## The Core Concept: Decide → Act → Respond

Every AI agent follows this pattern:

1. **Receive** a request from the user
2. **Decide** what action(s) to take (if any)
3. **Act** by executing tools
4. **Respond** based on the results

This is called the **agent loop**. The AI keeps deciding and acting until it has enough information to respond.

## Why This Matters

Agents can:
- Read and send your emails
- Search databases
- Create calendar events
- Control smart home devices
- Write and execute code
- Anything you can do through an API

The AI decides *when* and *how* to use these capabilities based on natural language requests. You don't click buttons - you describe what you want.

## What We're Building

We'll build an agent called Oscar that manages emails. When you say "find that email from John about the budget," Oscar will:

1. Understand you want to search emails
2. Decide to use the `search_emails` tool
3. Execute a Gmail API search
4. Return the relevant emails in a conversational response

But here's the key insight: **Oscar is just an example.** The same patterns work for any agent:
- Replace Gmail with Slack → Slack agent
- Replace Gmail with a database → Data query agent
- Replace Gmail with smart home APIs → Home automation agent

The architecture stays the same. Only the tools change.

## The Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │ ←→  │   Backend   │ ←→  │   Claude    │
│    (UI)     │     │  (Server)   │     │  (Brain)    │
└─────────────┘     └─────────────┘     └─────────────┘
                           ↕
                    ┌─────────────┐
                    │  External   │
                    │  Services   │
                    │ (Gmail, etc)│
                    └─────────────┘
```

- **Frontend**: What users see. A chat interface.
- **Backend**: The coordinator. Receives messages, talks to Claude, executes tools.
- **Claude**: The brain. Understands requests and decides what tools to use.
- **External Services**: The APIs your agent connects to (Gmail in our case, but could be anything).

## Checkpoint: Before Moving On

Make sure you understand:

- [ ] The difference between a chatbot (responds) and an agent (acts)
- [ ] The agent loop: Decide → Act → Respond
- [ ] Why we need a backend (security - API keys can't live in frontend code)
- [ ] That Oscar is an example - you can build agents for any service

---

# Chapter 2: Setting Up Your Foundation

> **Video Note:** This is a "follow along" chapter - screen share the terminal, show each command. 5-7 minutes. Keep it practical.

## What We're Doing

Setting up the project structure. This foundation works for any agent - we'll customize it for email later.

## Why This Structure?

We're using a **monorepo** - one repository with frontend and backend packages. This keeps related code together and simplifies development.

## Step 1: Create the Project

```bash
mkdir my-agent  # Call it whatever you want
cd my-agent
npm init -y
```

## Step 2: Configure as Monorepo

Replace `package.json` contents:

```json
{
  "name": "my-agent",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev:frontend": "npm run dev --workspace=packages/frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

## Step 3: Create Folder Structure

```bash
mkdir -p packages/backend/src
mkdir -p packages/frontend/src
```

## Step 4: Set Up TypeScript

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## Step 5: Create Environment File

Create `.env`:

```
# Your external service credentials go here
# For Gmail:
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Security
ENCRYPTION_KEY=

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Create `.gitignore`:

```
node_modules/
.env
*.log
dist/
.tokens.json
```

## Step 6: Install Dependencies

```bash
npm install
```

## Checkpoint: Before Moving On

- [ ] Folder structure: `packages/backend/`, `packages/frontend/`
- [ ] Root `package.json` with workspaces configured
- [ ] `.env` file created (credentials empty for now)
- [ ] `.gitignore` includes `.env` and `node_modules/`

---

# Chapter 3: The Agent Loop

> **Video Note:** This is the most important conceptual chapter. Consider a whiteboard-style explanation of the loop, then show code. 10-12 minutes. The loop is the core insight.

## What We're Doing

Building the backend that implements the agent loop. This is where your agent's "brain" lives.

## Understanding the Loop

When you ask an agent a question, here's what happens:

```
1. Your message arrives
2. Claude receives message + list of available tools
3. Claude decides: "I need to use tool X"
4. Backend executes tool X, returns result
5. Claude receives result
6. Claude decides: "I have enough info" OR "I need another tool"
7. (Loop continues until Claude is ready to respond)
8. Claude generates final response
9. Response streams back to user
```

The Claude Agent SDK handles this loop for you. You define tools, and the SDK manages the back-and-forth.

## Step 1: Set Up Backend Package

Create `packages/backend/package.json`:

```json
{
  "name": "agent-backend",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/claude-code": "^1.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "googleapis": "^144.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.5",
    "tsx": "^4.19.1"
  }
}
```

Create `packages/backend/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## Step 2: Create the Server

Create `packages/backend/src/index.ts`:

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.use('/chat', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Agent backend running on port ${PORT}`);
});
```

## Step 3: Create the Chat Route (The Agent Loop)

This is where the magic happens. Create `packages/backend/src/routes/chat.ts`:

```typescript
import { Router } from 'express';
import { query, createSdkMcpServer } from '@anthropic-ai/claude-code';

const router = Router();

router.post('/', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  // Set up streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Create MCP server with tools (empty for now)
    const mcpServer = createSdkMcpServer({
      name: 'my-agent',
      tools: [
        // Tools go here - we'll add them in Chapter 4
      ]
    });

    // This is the agent loop - query() handles it all
    const response = await query({
      prompt: message,
      systemPrompt: `You are a helpful AI assistant.`,  // Customize this!
      mcpServers: [mcpServer],
      options: {
        maxThinkingTokens: 10000,  // Gives Claude a "scratchpad" to reason
      },
      onMessage: (msg) => {
        // Stream text as it's generated
        if (msg.type === 'stream_event') {
          const event = (msg as any).event;
          if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({
              type: 'text',
              content: event.delta.text
            })}\n\n`);
          }
        }
        // Notify when tools are used
        if (msg.type === 'assistant') {
          const content = msg.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                res.write(`data: ${JSON.stringify({
                  type: 'tool_use',
                  name: block.name
                })}\n\n`);
              }
            }
          }
        }
      }
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Agent error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Something went wrong' })}\n\n`);
    res.end();
  }
});

export default router;
```

**Let's break down the key parts:**

### The `query()` function

This is the Agent SDK's main function. It:
- Sends your message to Claude
- Provides available tools
- Lets Claude decide which tools to use
- Executes those tools automatically
- Returns the final response

You don't write the loop - `query()` handles it.

### The `systemPrompt`

This is where you define your agent's personality and boundaries. We'll customize this heavily in Chapter 8.

### The `onMessage` callback

This fires for every event during the agent loop:
- Text being generated
- Tools being used
- Thinking happening

We use it to stream responses in real-time.

### `maxThinkingTokens`

This gives Claude a "scratchpad" to reason through complex problems before responding. Higher values = more thorough thinking, but slower responses.

## Validation: Test the Loop

1. Make sure you have Claude CLI configured:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

2. Install dependencies and start:
   ```bash
   npm install
   npm run dev:backend
   ```

3. Test:
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok"}

   curl -X POST http://localhost:3001/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, who are you?"}'
   ```

You should see streamed SSE responses. The agent works - it just doesn't have any tools yet.

## Checkpoint: Before Moving On

- [ ] Backend starts without errors
- [ ] `/health` returns `{"status":"ok"}`
- [ ] Chat endpoint responds to basic questions
- [ ] You understand: `query()` runs the agent loop, `onMessage` lets you stream events

---

# Chapter 4: Giving Your Agent Tools

> **Video Note:** Start with one simple tool, show it working, then add more. Emphasize tool descriptions - they're how Claude knows when to use each tool. 10-12 minutes.

## What We're Doing

Tools are what transform a chatbot into an agent. A tool is a capability your agent can use to take action.

## Anatomy of a Tool

Every tool has:

1. **Name**: How Claude refers to it (e.g., `search_emails`)
2. **Description**: When to use it - this is crucial
3. **Parameters**: What inputs it needs
4. **Execute function**: What it actually does

The description is the most important part. Claude reads it to decide whether to use the tool. A vague description = Claude won't use it correctly.

## Creating a Tool

Create `packages/backend/src/agent/tools/` folder:

```bash
mkdir -p packages/backend/src/agent/tools
```

Let's create a simple example tool first. Create `packages/backend/src/agent/tools/getCurrentTime.ts`:

```typescript
import { tool } from '@anthropic-ai/claude-code';
import { z } from 'zod';

export const getCurrentTimeTool = tool({
  name: 'get_current_time',
  description: `Get the current date and time. Use this when the user asks what time it is, what today's date is, or needs current temporal information.`,
  parameters: z.object({
    timezone: z.string().optional().describe('Timezone (e.g., "America/New_York"). Defaults to UTC.'),
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timezone || 'UTC',
    };
    return {
      formatted: now.toLocaleString('en-US', options),
      iso: now.toISOString(),
      timezone: timezone || 'UTC',
    };
  }
});
```

**Notice the description:** It's specific about *when* to use the tool. Not just "gets time" but "use this when the user asks what time it is..."

## Good vs Bad Tool Descriptions

**Bad:**
```
description: "Searches emails"
```

**Good:**
```
description: "Search emails using Gmail search syntax. Use this when the user wants to find specific emails by sender, subject, content, or date. Examples: 'from:john', 'subject:meeting', 'after:2024/01/01'"
```

The good description tells Claude:
- What it does
- When to use it
- How to use it (with examples)

## Adding Tools to Your Agent

Create `packages/backend/src/agent/tools/index.ts`:

```typescript
export { getCurrentTimeTool } from './getCurrentTime.js';
// Add more tools here as you create them
```

Update `packages/backend/src/routes/chat.ts`:

```typescript
import { getCurrentTimeTool } from '../agent/tools/index.js';

// In the createSdkMcpServer call:
const mcpServer = createSdkMcpServer({
  name: 'my-agent',
  tools: [
    getCurrentTimeTool,
    // Add more tools here
  ]
});
```

## Test Your Tool

Restart the backend and try:

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What time is it?"}'
```

You should see Claude use the `get_current_time` tool and respond with the current time.

## The Tool Pattern

Every tool you create follows this pattern:

```typescript
import { tool } from '@anthropic-ai/claude-code';
import { z } from 'zod';

export const myTool = tool({
  name: 'tool_name',
  description: `Detailed description of what this tool does and WHEN to use it.`,
  parameters: z.object({
    // Define inputs with descriptions
    param1: z.string().describe('What this parameter is for'),
    param2: z.number().optional().default(10).describe('Optional with default'),
  }),
  execute: async ({ param1, param2 }) => {
    // Do the actual work
    // Return results (Claude will see this)
    return { result: 'something' };
  }
});
```

## Real-World Tools (Gmail Example)

For Oscar, we create tools like:

- `list_emails` - Get recent emails
- `search_emails` - Search with Gmail syntax
- `read_email` - Get full email content
- `send_email` - Send an email

Each connects to the Gmail API (which we'll set up in Chapter 5).

The same pattern works for any service:
- Slack: `send_message`, `list_channels`, `search_messages`
- Calendar: `create_event`, `list_events`, `find_free_time`
- Database: `query_data`, `insert_record`, `update_record`

## Checkpoint: Before Moving On

- [ ] Created a test tool (like `get_current_time`)
- [ ] Tool is exported from `index.ts`
- [ ] Tool is added to `createSdkMcpServer`
- [ ] Testing confirms Claude uses the tool appropriately
- [ ] You understand: name, description, parameters, execute

---

# Chapter 5: Connecting to External Services

> **Video Note:** Two parts: (1) Service setup walkthrough (Google Cloud Console for Gmail), 5-7 min. (2) OAuth implementation, 8-10 min. These could be separate videos.

## What We're Doing

Connecting your agent to external services. We'll use Gmail as the example, but the pattern applies to any OAuth-based API.

## The OAuth Pattern

Most APIs use OAuth for authentication:

1. User clicks "Connect"
2. They're redirected to the service (Google, Slack, etc.)
3. They approve access
4. Service redirects back with a code
5. You exchange the code for tokens
6. You use tokens to make API calls

## Step 1: Set Up Your Service (Gmail Example)

For Gmail:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Gmail API
4. Create OAuth credentials (Web application)
5. Add redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env`

For other services, the process is similar - find their developer console and create OAuth credentials.

## Step 2: Create Token Storage

Tokens are sensitive. We encrypt them before storing. Create `packages/backend/src/services/tokenStore.ts`:

```typescript
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), '.tokens.json');
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars. Generate: openssl rand -hex 32');
  }
  return Buffer.from(key, 'hex');
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Storage functions
export function storeToken(email: string, tokens: any): void {
  const stored = loadTokens();
  const encrypted = encrypt(JSON.stringify(tokens));
  const existing = stored.findIndex(t => t.email === email);
  if (existing >= 0) {
    stored[existing].tokens = encrypted;
  } else {
    stored.push({ email, tokens: encrypted });
  }
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(stored, null, 2));
}

export function getToken(email: string): any | null {
  const stored = loadTokens();
  const found = stored.find(t => t.email === email);
  return found ? JSON.parse(decrypt(found.tokens)) : null;
}

export function getAllTokens(): Array<{ email: string; tokens: any }> {
  return loadTokens().map(t => ({
    email: t.email,
    tokens: JSON.parse(decrypt(t.tokens))
  }));
}

export function removeToken(email: string): void {
  const stored = loadTokens().filter(t => t.email !== email);
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(stored, null, 2));
}

export function getConnectedAccounts(): string[] {
  return loadTokens().map(t => t.email);
}

function loadTokens(): Array<{ email: string; tokens: string }> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return [];
}
```

Generate your encryption key:
```bash
openssl rand -hex 32
```

Add it to `.env` as `ENCRYPTION_KEY`.

## Step 3: Create Service Client (Gmail Example)

Create `packages/backend/src/services/gmail.ts`:

```typescript
import { google, gmail_v1 } from 'googleapis';
import { getAllTokens, storeToken } from './tokenStore.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
}

export async function handleCallback(code: string): Promise<string> {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email!;

  storeToken(email, tokens);
  return email;
}

export async function getAllGmailClients(): Promise<Array<{ gmail: gmail_v1.Gmail; email: string }>> {
  const allTokens = getAllTokens();
  const clients: Array<{ gmail: gmail_v1.Gmail; email: string }> = [];

  for (const { email, tokens } of allTokens) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    client.setCredentials(tokens);
    client.on('tokens', (newTokens) => {
      storeToken(email, { ...tokens, ...newTokens });
    });

    const gmail = google.gmail({ version: 'v1', auth: client });
    clients.push({ gmail, email });
  }

  return clients;
}
```

## Step 4: Create Auth Routes

Create `packages/backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { getAuthUrl, handleCallback } from '../services/gmail.js';
import { getConnectedAccounts, removeToken } from '../services/tokenStore.js';

const router = Router();

router.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }
  try {
    const email = await handleCallback(code);
    res.redirect(`${process.env.FRONTEND_URL}?connected=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
  }
});

router.get('/status', (req, res) => {
  const accounts = getConnectedAccounts();
  res.json({ authenticated: accounts.length > 0, accounts: accounts.map(email => ({ email })) });
});

router.delete('/disconnect/:email', (req, res) => {
  removeToken(req.params.email);
  res.json({ success: true });
});

router.delete('/disconnect', (req, res) => {
  getConnectedAccounts().forEach(email => removeToken(email));
  res.json({ success: true });
});

export default router;
```

Add to `packages/backend/src/index.ts`:

```typescript
import authRoutes from './routes/auth.js';
// ...
app.use('/auth', authRoutes);
```

## Step 5: Create Service-Specific Tools

Now create tools that use your service. Example for Gmail:

Create `packages/backend/src/agent/tools/listEmails.ts`:

```typescript
import { tool } from '@anthropic-ai/claude-code';
import { z } from 'zod';
import { getAllGmailClients } from '../../services/gmail.js';

export const listEmailsTool = tool({
  name: 'list_emails',
  description: `List recent emails from the user's inbox. Use this when the user asks about their emails, inbox, or wants to see recent messages.`,
  parameters: z.object({
    maxResults: z.number().optional().default(10),
  }),
  execute: async ({ maxResults }) => {
    const clients = await getAllGmailClients();
    if (clients.length === 0) {
      return { error: 'No accounts connected. Please connect Gmail first.' };
    }

    const allEmails = [];
    for (const { gmail, email } of clients) {
      try {
        const response = await gmail.users.messages.list({ userId: 'me', maxResults });
        const messages = response.data.messages || [];

        for (const msg of messages) {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });
          const headers = detail.data.payload?.headers || [];
          allEmails.push({
            id: msg.id,
            account: email,
            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
            subject: headers.find(h => h.name === 'Subject')?.value || '(No subject)',
            date: headers.find(h => h.name === 'Date')?.value || '',
            snippet: detail.data.snippet || '',
          });
        }
      } catch (error) {
        console.error(`Error fetching from ${email}:`, error);
      }
    }
    return { emails: allEmails, total: allEmails.length };
  }
});
```

Create similar tools for `search_emails`, `read_email`, `send_email` following the same pattern.

## Checkpoint: Before Moving On

- [ ] External service credentials in `.env`
- [ ] Encryption key generated and added
- [ ] OAuth flow works (redirects to service and back)
- [ ] `.tokens.json` created after connecting
- [ ] `/auth/status` shows connected account
- [ ] Tools can access the service

---

# Chapter 6: Building the Interface

> **Video Note:** Scaffolding chapter - consider a sped-up "watch me build" video, ~8-10 minutes. Slow down for state management and streaming concepts.

## What We're Doing

Building the frontend. Any UI framework works - we'll use React, but the concepts apply to Vue, Svelte, vanilla JS, etc.

## The Key Concepts

1. **State management**: Track messages, streaming status, authentication
2. **Streaming**: Display text as it arrives, not all at once
3. **Tool indicators**: Show users when the agent is taking actions

## Step 1: Set Up Frontend Package

Create `packages/frontend/package.json`:

```json
{
  "name": "agent-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.15",
    "@types/react": "^18.3.8",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.12",
    "typescript": "^5.5.3",
    "vite": "^5.4.7"
  }
}
```

## Step 2: Create State Management

Create `packages/frontend/src/store/chatStore.ts`:

```typescript
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolUse?: { name: string; status: 'pending' | 'success' | 'error' };
}

interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  sessionId: string;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setToolUse: (name: string, status: 'pending' | 'success' | 'error') => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  sessionId: crypto.randomUUID(),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant') {
      last.content += content;
    }
    return { messages };
  }),

  setToolUse: (name, status) => set((state) => {
    const messages = [...state.messages];
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant') {
      last.toolUse = { name, status };
    }
    return { messages };
  }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [], sessionId: crypto.randomUUID() }),
}));
```

## Step 3: Create Chat Hook (Handles Streaming)

Create `packages/frontend/src/hooks/useChat.ts`:

```typescript
import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';

export function useChat() {
  const { addMessage, updateLastMessage, setToolUse, setStreaming, sessionId } = useChatStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({ id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() });

    // Add empty assistant message (will be filled by stream)
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date() });

    setStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sessionId }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              updateLastMessage(data.content);
            } else if (data.type === 'tool_use') {
              setToolUse(data.name, 'pending');
            } else if (data.type === 'done') {
              setToolUse('', 'success');
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') console.error('Chat error:', error);
    } finally {
      setStreaming(false);
    }
  }, [addMessage, updateLastMessage, setToolUse, setStreaming, sessionId]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setStreaming(false);
  }, [setStreaming]);

  return { sendMessage, cancelStream };
}
```

## Step 4: Build Components

The UI components (ChatContainer, MessageList, MessageItem, ChatInput, Sidebar) follow standard React patterns. The key insight is:

- **MessageItem** renders differently for user vs assistant messages
- **Tool indicators** show when the agent is working
- **Markdown rendering** makes responses readable

See the complete code in the BUILDING_OSCAR.md file for full component implementations.

## Checkpoint: Before Moving On

- [ ] Frontend starts with `npm run dev:frontend`
- [ ] State management works (messages appear in chat)
- [ ] Streaming works (text appears incrementally)
- [ ] Tool indicators show when agent uses tools

---

# Chapter 7: Streaming & Real-time UX

> **Video Note:** Short chapter - 5 minutes. Demo the full system, show the UX difference between streaming and non-streaming.

## What We're Doing

Understanding how streaming improves user experience.

## Why Streaming Matters

Without streaming:
```
User sends message → Waits 5 seconds → Entire response appears
```

With streaming:
```
User sends message → Text appears word by word → Feels instant
```

Even if total time is the same, streaming *feels* faster because users can start reading immediately.

## The Streaming Flow

1. Backend uses Server-Sent Events (SSE)
2. Each text chunk is sent as it's generated
3. Frontend reads the stream and updates the UI
4. User sees text appear progressively

## SSE Format

```
data: {"type": "text", "content": "Hello"}

data: {"type": "text", "content": " there"}

data: {"type": "tool_use", "name": "list_emails"}

data: {"type": "text", "content": "I found 5 emails..."}

data: {"type": "done"}
```

Each `data:` line is a separate event. The frontend parses these and updates accordingly.

## Full System Test

Start everything:
```bash
npm run dev
```

1. Open `http://localhost:5173`
2. Connect your service (Gmail)
3. Ask a question that requires a tool
4. Watch: tool indicator appears, then text streams in

This is your agent working end-to-end.

## Checkpoint: Before Moving On

- [ ] Both servers running
- [ ] Service connected
- [ ] Questions answered using tools
- [ ] Text streams progressively
- [ ] Tool indicators visible during tool use

---

# Chapter 8: Making It Yours

> **Video Note:** Important chapter - 10-12 minutes. Show before/after of customizations. Emphasize that iteration is expected and necessary.

## The Foundation Is Just the Beginning

What we've built is a working agent. But it's generic. Your agent should reflect:

- Your brand/personality
- Your specific use case
- Your users' needs

This requires iteration. Expect to spend time refining after the initial build.

## Customizing the System Prompt

The system prompt is your agent's personality. In `chat.ts`:

```typescript
systemPrompt: `You are a helpful AI assistant.`
```

This is too generic. Make it specific:

```typescript
systemPrompt: `You are Oscar, a friendly and efficient email assistant.

Your personality:
- Concise but warm
- Proactive about offering help
- You use occasional emoji when appropriate
- You never send emails without explicit confirmation

When listing emails, always summarize the most important ones first.
When searching, explain what you're searching for.
When sending, always confirm recipient, subject, and content before sending.

If the user hasn't connected their email yet, gently encourage them to do so.`
```

**Iterate on this.** Test with various queries. Adjust the personality. Add edge case handling. This is where your agent becomes unique.

## Customizing Tools

Your initial tool descriptions might not be perfect. Watch how Claude uses them:

- Does it use the right tool for each query?
- Does it miss cases where it should use a tool?
- Does it use tools when it shouldn't?

Refine descriptions based on real usage:

```typescript
// Before (too vague)
description: `Search emails.`

// After (specific with examples)
description: `Search emails using Gmail search syntax. Use this when the user wants to find specific emails - by sender (from:), subject (subject:), date (after:/before:), or content. DO NOT use this for general "show me my emails" requests - use list_emails instead.`
```

## Customizing the UI

The default UI is intentionally minimal. Customize:

- **Colors**: Update Tailwind config with your brand colors
- **Logo**: Replace the panda with your icon
- **Layout**: Move sidebar, change proportions
- **Typography**: Adjust fonts and sizes
- **Features**: Add conversation history, user settings, themes

The frontend is standard React - modify it like any React app.

## Adding Personality Through UI

Small touches matter:
- Custom loading animations
- Unique empty states
- Branded error messages
- Thoughtful micro-interactions

## Iteration Process

1. **Use your agent** - Be your own first user
2. **Notice friction** - What's confusing? What's missing?
3. **Adjust and test** - Make small changes, verify they help
4. **Get feedback** - Have others use it, watch where they struggle
5. **Repeat** - This never really ends

## Common Customizations

**System Prompt:**
- Personality (formal vs casual)
- Boundaries (what it won't do)
- Domain knowledge (specific terminology)
- Response format preferences

**Tools:**
- Better descriptions
- Additional parameters
- New tools for missing capabilities
- Removing unused tools

**UI:**
- Branding (colors, logo, fonts)
- Layout changes
- New features (history, settings)
- Mobile responsiveness

## Checkpoint: Before Moving On

- [ ] Customized system prompt with specific personality
- [ ] Reviewed and refined tool descriptions
- [ ] Made at least one UI customization
- [ ] Tested with various queries to find edge cases

**Remember:** The first version is never the final version. Iteration is expected.

---

# Chapter 9: Where to Go From Here

> **Video Note:** Wrap-up video, 3-5 minutes. Recap, next steps, encouragement.

## What You Built

You built an AI agent that:
- Understands natural language
- Decides which actions to take
- Executes those actions via tools
- Streams responses in real-time
- Connects to external services securely

This isn't a chatbot. This is an agent.

## What You Learned

1. **Agents vs Chatbots**: Agents act, chatbots just respond
2. **The Agent Loop**: Decide → Act → Respond
3. **Tools**: Capabilities your agent can use
4. **Tool Descriptions**: How Claude knows when to use each tool
5. **OAuth**: Secure access to user accounts
6. **Streaming**: Real-time UX for AI responses
7. **Iteration**: The first version is just the beginning

## Extending Your Agent

**More Tools:**
- Calendar integration
- Task management
- Slack/Teams messaging
- Database queries
- File operations

**Enhanced Features:**
- Conversation memory
- Voice input
- Multi-modal (images)
- Scheduled actions
- Webhooks/triggers

**Production Considerations:**
- Database for token storage
- User accounts
- Rate limiting
- Error monitoring
- Analytics

## The Agent Pattern Applies Everywhere

The pattern you learned works for any agent:

1. Define tools that connect to your service
2. Write good descriptions so Claude knows when to use them
3. Set up authentication for secure access
4. Build UI that shows what's happening
5. Iterate on personality and capabilities

Gmail was just the example. The architecture is the same whether you're building:
- A customer support agent
- A data analysis assistant
- A home automation controller
- A coding helper
- Anything else

## Keep Building

This guide gave you the foundation. Now make it yours.

What will you build?

---

## Quick Reference

### Starting the App
```bash
npm run dev
```

### Adding a New Tool
1. Create file in `packages/backend/src/agent/tools/`
2. Export from `index.ts`
3. Add to `createSdkMcpServer` in `chat.ts`
4. Restart backend

### Customizing Personality
Edit `systemPrompt` in `packages/backend/src/routes/chat.ts`

### Key Files
- `packages/backend/src/routes/chat.ts` - Agent loop and system prompt
- `packages/backend/src/agent/tools/` - Tool definitions
- `packages/frontend/src/store/chatStore.ts` - State management
- `packages/frontend/src/hooks/useChat.ts` - Streaming logic

---

*This is a foundation. Make it yours.*
