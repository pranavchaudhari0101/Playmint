import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { parseQuery } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';
import type { AppEnv } from '../env';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ordersRouter = new Hono<AppEnv>();
ordersRouter.use('*', authMiddleware);

ordersRouter.get('/', async (c) => {
  const { limit, offset } = parseQuery(c, listQuerySchema);
  return c.json(await checkoutService.listOrders(c.get('userId'), { limit, offset }));
});

ordersRouter.get('/:id', async (c) => {
  return c.json({ order: await checkoutService.getOrder(c.get('userId'), c.req.param('id')) });
});

ordersRouter.post('/:id/cancel', async (c) => {
  return c.json(await checkoutService.cancelOrder(c.get('userId'), c.req.param('id')));
});
