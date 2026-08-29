import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { goalService } from '../services/goalService';
import { ledgerService } from '../services/ledgerService';

const setGoalSchema = z.object({
  productId: z.string().uuid(),
});

export const goalsRouter = Router();
goalsRouter.use(authenticate);

goalsRouter.get('/active', async (req: AuthRequest, res: Response) => {
  const wallet = await ledgerService.getWallet(req.userId!);
  res.json({ goal: await goalService.getActive(req.userId!, wallet.balance) });
});

goalsRouter.post('/', validateBody(setGoalSchema), async (req: AuthRequest, res: Response) => {
  const wallet = await ledgerService.getWallet(req.userId!);
  const goal = await goalService.setActive(req.userId!, req.body.productId, wallet.balance);
  res.status(201).json({ goal });
});

goalsRouter.delete('/active', async (req: AuthRequest, res: Response) => {
  await goalService.dropActive(req.userId!);
  res.status(204).send();
});
