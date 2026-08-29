import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import { parseBody, parseQuery } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { ApiError } from '../errors';
import { ledgerService } from '../services/ledgerService';
import { withTransaction } from '../db';
import type { AppEnv } from '../env';

/**
 * Gameplay earn endpoint. In the demo the game client calls this
 * directly; in production the game SERVER calls a signed S2S variant.
 * Guardrails: positive integer, capped amount, per-user rate limit,
 * mandatory idempotency key.
 */
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

export const walletRouter = new Hono<AppEnv>();
walletRouter.use('*', authMiddleware);

walletRouter.get('/', async (c) => {
  const wallet = await ledgerService.getWallet(c.get('userId'));
  return c.json(wallet);
});

walletRouter.get('/ledger', async (c) => {
  const { limit, offset } = parseQuery(c, ledgerQuerySchema);
  const result = await ledgerService.listEntries(c.get('userId'), { limit, offset });
  return c.json(result);
});

walletRouter.post('/earn', async (c) => {
  const { amount, source, eventId } = await parseBody(c, earnSchema);
  const userId = c.get('userId');

  // Best-effort per-isolate limiter (20 earn events / minute / user).
  if (!rateLimit(`earn:${userId}`, 20, 60_000)) {
    throw ApiError.tooManyRequests('Too many earn events');
  }

  const result = await withTransaction((client) =>
    ledgerService.earn(
      client,
      userId,
      amount,
      `${SOURCE_LABELS[source] ?? source} (+${amount} Sparks)`,
      `earn:${userId}:${eventId}`
    )
  );

  return c.json(
    {
      transactionId: result.entryId,
      newBalance: result.wallet.balance,
      duplicate: result.duplicate,
    },
    result.duplicate ? 200 : 201,
  );
});
