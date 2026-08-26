import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import shortRoutes from './routes/shortRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import instagramRoutes from './routes/instagramRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

  app.get('/favicon.ico', (_req, res) => res.status(204).end());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ShortifyAI', storage: 'local' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/shorts', shortRoutes);
  app.use('/api/download', downloadRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/youtube', youtubeRoutes);
  app.use('/api/instagram', instagramRoutes);
  app.use('/api/system', systemRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
