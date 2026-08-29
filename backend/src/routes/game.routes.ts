import { Router, Response } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { gameService } from '../services/gameService';

const progressQuerySchema = z.object({
  game: z.string().default('vector'),
});

const completeLevelSchema = z.object({
  game: z.string().default('vector'),
  level: z.number().int().min(1).max(10),
  seconds: z.number().int().min(0),
  moves: z.number().int().min(1),
});

export const gameRouter = Router();
gameRouter.use(authenticate);

gameRouter.get('/progress', validateQuery(progressQuerySchema), async (req: AuthRequest, res: Response) => {
  const { game } = req.query as unknown as { game: string };
  const progress = await gameService.getProgress(req.userId!, game);
  res.json(progress);
});

gameRouter.post('/complete-level', validateBody(completeLevelSchema), async (req: AuthRequest, res: Response) => {
  const { game, level, seconds, moves } = req.body;
  const result = await gameService.completeLevel(req.userId!, level, seconds, moves, game);
  res.json(result);
});
