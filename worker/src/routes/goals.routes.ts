import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../middleware/validate';
import { goalService } from '../services/goalService';
import { ledgerService } from '../services/ledgerService';
import type { AppEnv } from '../env';

const setGoalSchema = z.object({
  productId: z.string().uuid(),
});

export const goalsRouter = new Hono<AppEnv>();
goalsRouter.use('*', authMiddleware);

goalsRouter.get('/active', async (c) => {
  const wallet = await ledgerService.getWallet(c.get('userId'));
  return c.json({ goal: await goalService.getActive(c.get('userId'), wallet.balance) });
});

goalsRouter.post('/', async (c) => {
  const { productId } = await parseBody(c, setGoalSchema);
  const wallet = await ledgerService.getWallet(c.get('userId'));
  const goal = await goalService.setActive(c.get('userId'), productId, wallet.balance);
  return c.json({ goal }, 201);
});

goalsRouter.delete('/active', async (c) => {
  await goalService.dropActive(c.get('userId'));
  return c.body(null, 204);
});
