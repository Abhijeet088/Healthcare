import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import apiRouter from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend cross-origin requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve OCR uploaded documents statically
const uploadDir = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), service: 'Your Health Will Partner Backend' });
});

// Mount main API router
app.use('/api', apiRouter);

// Initialize DB and launch server
const startServer = async () => {
  try {
    console.log('Initializing database schema...');
    await initDb();
    console.log('Database schema verified.');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===================================================`);
      console.log(` Your Health Will Partner Secure Backend running on port ${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(`===================================================`);
    });
  } catch (err) {
    console.error('CRITICAL: Server initialization failed:', err);
    process.exit(1);
  }
};

startServer();
