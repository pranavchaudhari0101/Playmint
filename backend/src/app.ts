import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { ApiError } from './errors';
import { healthCheck } from './db';
import { walletRouter } from './routes/wallet.routes';
import { catalogRouter } from './routes/catalog.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { ordersRouter } from './routes/orders.routes';
import { goalsRouter } from './routes/goals.routes';
import { paymentsRouter, webhookRouter } from './routes/payments.routes';
import { adminRouter } from './routes/admin.routes';
import { gameRouter } from './routes/game.routes';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin.split(','),
      credentials: false,
    })
  );

  // Webhook route must receive the raw body for HMAC verification.
  app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '256kb' }), webhookRouter);

  app.use(express.json({ limit: '256kb' }));

  app.get('/health', async (_req, res) => {
    const dbUp = await healthCheck();
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp });
  });

  app.use('/api/wallet', walletRouter);
  app.use('/api/game', gameRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/goals', goalsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/admin', adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }
    console.error('[unhandled]', err);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  });

  return app;
}
