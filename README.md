# Oscar - Gmail Assistant

A full-stack chat application that lets you interact with your Gmail using AI. Built with React, Express, and Claude AI.

## Features

- **Chat Interface**: Natural language interface to interact with your Gmail
- **Email Operations**: Read, search, and send emails through conversation
- **Label Management**: Create and manage Gmail labels
- **Streaming Responses**: Real-time streaming of AI responses
- **Session Persistence**: Conversation history preserved across page reloads

## Prerequisites

- Node.js 18+
- Google Cloud Project with Gmail API enabled
- Anthropic API key

## Setup

### 1. Clone and Install

```bash
cd oscar
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add `http://localhost:3001/auth/google/callback` as an authorized redirect URI
7. Note your Client ID and Client Secret

### 3. Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Backend
PORT=3001
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Token encryption (generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=your-32-byte-hex-key

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-api-key

# Frontend
VITE_API_URL=http://localhost:3001
```

### 4. Run Development Servers

Start both backend and frontend:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

Or run both concurrently:

```bash
npm run dev
```

### 5. Access the App

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Click "Connect Gmail" to authorize the app
2. Start chatting! Try:
   - "Show me my unread emails"
   - "Search for emails from john@example.com"
   - "Read the latest email"
   - "Send a reply saying I'll get back to them tomorrow"
   - "Create a label called 'Important'"

## Project Structure

```
oscar/
├── packages/
│   ├── backend/          # Express + Claude AI backend
│   │   └── src/
│   │       ├── agent/    # Gmail tools for Claude
│   │       ├── routes/   # API endpoints
│   │       └── services/ # Gmail client, token storage
│   │
│   └── frontend/         # React + Tailwind frontend
│       └── src/
│           ├── components/  # UI components
│           ├── hooks/       # React hooks
│           └── store/       # Zustand store
│
├── .env.example
└── README.md
```

## Gmail Scopes

The app requests these Gmail permissions:
- `gmail.modify` - Read and modify emails
- `gmail.labels` - Manage labels
- `gmail.send` - Send emails

## Security

- OAuth tokens are encrypted at rest using AES-256-GCM
- No credentials stored in frontend
- CORS restricted to frontend origin
- Session isolation per user

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Express, TypeScript, Anthropic SDK
- **APIs**: Gmail API, Claude AI
