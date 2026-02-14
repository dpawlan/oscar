import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authMiddleware } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error-handler.js';
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
    name: 'Oura Ring API',
    endpoints: ['GET /health', 'POST /mcp', 'POST /mcp-brittany-oura'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper: handle an MCP request with the given access token
async function handleMcp(req: express.Request, res: express.Response, token: string) {
  const server = createMcpServer(token);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
}

// MCP endpoint — David (default)
app.post('/mcp', async (req, res) => {
  await handleMcp(req, res, process.env.OURA_ACCESS_TOKEN!);
});

// MCP endpoint — Brittany
app.post('/mcp-brittany-oura', async (req, res) => {
  await handleMcp(req, res, process.env.OURA_ACCESS_TOKEN_BRITTANY!);
});

app.get('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST for MCP requests.' });
});

app.get('/mcp-brittany-oura', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. Use POST for MCP requests.' });
});

app.delete('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. This is a stateless endpoint.' });
});

app.delete('/mcp-brittany-oura', (_req, res) => {
  res.status(405).json({ error: 'Method Not Allowed. This is a stateless endpoint.' });
});

app.use(errorHandler);

// Local dev server
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`Oura Ring API server running on http://localhost:${port}`);
  });
}

export default app;
