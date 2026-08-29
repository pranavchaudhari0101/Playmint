import { Hono } from 'hono';
import { z } from 'zod';
import { parseBody, parseQuery } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { gameService } from '../services/gameService';
import type { AppEnv } from '../env';

const progressQuerySchema = z.object({
  game: z.string().default('vector'),
});

const completeLevelSchema = z.object({
  game: z.string().default('vector'),
  level: z.number().int().min(1).max(10),
  seconds: z.number().int().min(0),
  moves: z.number().int().min(1),
});

export const gameRouter = new Hono<AppEnv>();
gameRouter.use('*', authMiddleware);

gameRouter.get('/progress', async (c) => {
  const { game } = parseQuery(c, progressQuerySchema);
  const progress = await gameService.getProgress(c.get('userId'), game);
  return c.json(progress);
});

gameRouter.post('/complete-level', async (c) => {
  const { game, level, seconds, moves } = await parseBody(c, completeLevelSchema);
  const result = await gameService.completeLevel(c.get('userId'), level, seconds, moves, game);
  return c.json(result);
});
