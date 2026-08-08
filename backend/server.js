import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import apiRouter from './routes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check — NO database needed, responds instantly
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'Your Health Will Partner Backend' });
});

// DB init state — lazy initialized on first /api request
let dbReady = false;
let dbError = null;

const ensureDb = async () => {
  if (dbReady) return;
  if (dbError) throw dbError;
  try {
    await initDb();
    dbReady = true;
    console.log('DB ready');
  } catch (err) {
    dbError = err;
    throw err;
  }
};

// DB init middleware — only for /api routes
app.use('/api', async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('DB init error:', err);
    res.status(500).json({ error: 'Database unavailable', detail: err.message });
  }
});

// API routes
app.use('/api', apiRouter);

// Default export for Vercel serverless
export default app;

// Local dev server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  ensureDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Your Health Will Partner Backend → http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}
