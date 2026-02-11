import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import contactsRouter from '../src/routes/contacts.js';
import birthdaysRouter from '../src/routes/birthdays.js';

// Load .env.local for local dev
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/contacts', contactsRouter);
app.use('/birthdays', birthdaysRouter);

app.use(errorHandler);

// Local dev server
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Clay API server running on http://localhost:${port}`);
  });
}

export default app;
