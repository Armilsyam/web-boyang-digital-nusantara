import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.ts';
import { seedDatabaseIfEmpty } from './seed.ts';
import { attachUser } from './middleware/auth.ts';
import { authRouter } from './routes/auth.ts';
import { catalogRouter } from './routes/catalog.ts';
import { ordersRouter } from './routes/orders.ts';
import { userRouter } from './routes/user.ts';
import { adminRouter } from './routes/admin.ts';

seedDatabaseIfEmpty();

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUser);

app.use('/uploads', express.static(config.uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    brand: 'BOYANG DIGITAL',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

// Serve built Vite SPA in production (or whenever dist/client exists)
const clientDistDir = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[BOYANG DIGITAL API ERROR]:', err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(config.port, () => {
  console.log(
    `🚀 BOYANG DIGITAL Server running on http://localhost:${config.port} (${config.nodeEnv})`
  );
});
