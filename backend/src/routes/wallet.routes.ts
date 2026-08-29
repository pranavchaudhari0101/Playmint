import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { validateBody, validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ledgerService } from '../services/ledgerService';
import { withTransaction } from '../db';

/**
 * Gameplay earn endpoint. In the demo the game client calls this
 * directly; in production the game SERVER calls a signed S2S variant.
 * Guardrails: positive integer, capped amount, per-user rate limit,
 * mandatory idempotency key.
 */
const earnLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many earn events' } },
});

const earnSchema = z.object({
  amount: z.number().int().positive().max(config.economy.maxEarnPerEvent),
  source: z.enum(['MATCH_WIN', 'MATCH_PLAYED', 'REWARDED_ACTION', 'LEVEL_UP', 'QUEST_COMPLETE']),
  eventId: z.string().min(6).max(128),
});

const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const SOURCE_LABELS: Record<string, string> = {
  MATCH_WIN: 'Match won',
  MATCH_PLAYED: 'Match played',
  REWARDED_ACTION: 'Rewarded action',
  LEVEL_UP: 'Level up',
  QUEST_COMPLETE: 'Quest complete',
};

export const walletRouter = Router();
walletRouter.use(authenticate);

walletRouter.get('/', async (req: AuthRequest, res: Response) => {
  const wallet = await ledgerService.getWallet(req.userId!);
  res.json(wallet);
});

walletRouter.get('/ledger', validateQuery(ledgerQuerySchema), async (req: AuthRequest, res: Response) => {
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };
  const result = await ledgerService.listEntries(req.userId!, { limit, offset });
  res.json(result);
});

walletRouter.post('/earn', earnLimiter, validateBody(earnSchema), async (req: AuthRequest, res: Response) => {
  const { amount, source, eventId } = req.body;

  const result = await withTransaction((client) =>
    ledgerService.earn(
      client,
      req.userId!,
      amount,
      `${SOURCE_LABELS[source] ?? source} (+${amount} Sparks)`,
      `earn:${req.userId}:${eventId}`
    )
  );

  res.status(result.duplicate ? 200 : 201).json({
    transactionId: result.entryId,
    newBalance: result.wallet.balance,
    duplicate: result.duplicate,
  });
});
