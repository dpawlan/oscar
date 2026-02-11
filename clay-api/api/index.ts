import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authMiddleware } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import contactsRouter from '../src/routes/contacts.js';
import birthdaysRouter from '../src/routes/birthdays.js';
import { createMcpServer } from '../src/mcp-server.js';

// Load .env.local for local dev
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Routes
app.get('/', (_req, res) => {
  res.json({
    name: 'Clay API',
    endpoints: ['GET /health', 'GET /contacts', 'GET /contacts/:id', 'GET /birthdays', 'POST /mcp'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/contacts', contactsRouter);
app.use('/birthdays', birthdaysRouter);

// MCP Streamable HTTP endpoint (stateless — no sessions)
app.post('/mcp', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
});

app.get('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST for MCP requests.' });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. This is a stateless endpoint.' });
});

app.use(errorHandler);

// Local dev server
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Clay API server running on http://localhost:${port}`);
  });
}

export default app;
