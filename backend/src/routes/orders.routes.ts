import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.get('/', validateQuery(listQuerySchema), async (req: AuthRequest, res: Response) => {
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };
  res.json(await checkoutService.listOrders(req.userId!, { limit, offset }));
});

ordersRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  res.json({ order: await checkoutService.getOrder(req.userId!, req.params.id as string) });
});

ordersRouter.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  res.json(await checkoutService.cancelOrder(req.userId!, req.params.id as string));
});

