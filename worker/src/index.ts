import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { initConfig, config } from './config';
import type { AppEnv } from './env';
import { healthCheck } from './db';
import { ApiError } from './errors';
import { walletRouter } from './routes/wallet.routes';
import { catalogRouter } from './routes/catalog.routes';
import { gameRouter } from './routes/game.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { ordersRouter } from './routes/orders.routes';
import { goalsRouter } from './routes/goals.routes';
import { paymentsRouter } from './routes/payments.routes';
import { adminRouter } from './routes/admin.routes';

const app = new Hono<AppEnv>();

// Worker bindings arrive per-request; fan them out into the shared config
// object the services read. Runs before everything else.
app.use('*', async (c, next) => {
  initConfig(c.env);
  await next();
});

// CORS allow-list = the Clerk authorized parties (the frontend origins).
app.use(
  '/api/*',
  cors({
    origin: (origin) =>
      origin && config.clerk.authorizedParties.includes(origin) ? origin : undefined,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  }),
);

app.get('/health', async (c) => {
  const dbUp = await healthCheck();
  return c.json({ status: dbUp ? 'ok' : 'degraded', db: dbUp }, dbUp ? 200 : 503);
});

app.route('/api/wallet', walletRouter);
app.route('/api/game', gameRouter);
app.route('/api/catalog', catalogRouter);
app.route('/api/checkout', checkoutRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/goals', goalsRouter);
app.route('/api/payments', paymentsRouter);
app.route('/api/admin', adminRouter);

app.notFound((c) => {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status as ContentfulStatusCode,
    );
  }
  console.error('[unhandled]', err);
  return c.json({ error: { code: 'INTERNAL', message: 'Something went wrong' } }, 500);
});

export default app;
