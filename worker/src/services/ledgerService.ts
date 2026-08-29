import { query, DBClient } from '../db';
import { ApiError } from '../errors';

/**
 * ─── Ledger Service ────────────────────────────────────────────────
 * The `ledger` table is the append-only source of truth for Sparks.
 * `wallets` is a materialized cache updated atomically in the same
 * transaction as every ledger insert. Concurrency is serialized per
 * user with `SELECT ... FOR UPDATE` row locks on the wallet row.
 *
 * Lifecycle for a purchase that spends Sparks:
 *   RESERVE (-amount) → COMMIT (0)      on payment success
 *                    → RELEASE (+amount) on payment failure/cancel
 *
 * Every operation accepts a DBClient so callers control the
 * transaction boundary (checkout composes several ops atomically).
 * ──────────────────────────────────────────────────────────────────
 */

export interface WalletState {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  entryType: 'EARN' | 'RESERVE' | 'COMMIT' | 'RELEASE' | 'ADJUSTMENT';
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

/** Locks the wallet row for the current transaction. Creates it if missing. */
export async function lockWallet(client: DBClient, userId: string): Promise<WalletState> {
  await client.query(
    `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  const res = await client.query(
    `SELECT balance, lifetime_earned, lifetime_spent
       FROM wallets WHERE user_id = $1 FOR UPDATE`,
    [userId]
  );
  const row = res.rows[0];
  return {
    balance: row.balance,
    lifetimeEarned: Number(row.lifetime_earned),
    lifetimeSpent: Number(row.lifetime_spent),
  };
}

async function readWallet(client: DBClient, userId: string): Promise<WalletState> {
  const res = await client.query(
    `SELECT balance, lifetime_earned, lifetime_spent FROM wallets WHERE user_id = $1`,
    [userId]
  );
  if (!res.rows[0]) return { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
  const row = res.rows[0];
  return {
    balance: row.balance,
    lifetimeEarned: Number(row.lifetime_earned),
    lifetimeSpent: Number(row.lifetime_spent),
  };
}

export const ledgerService = {
  /**
   * Credit Sparks (gameplay reward, earn-back bonus, welcome bonus).
   * Idempotent: an EARN with the same idempotencyKey is never applied twice.
   */
  async earn(
    client: DBClient,
    userId: string,
    amount: number,
    description: string,
    idempotencyKey?: string
  ): Promise<{ entryId: string | null; wallet: WalletState; duplicate: boolean }> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw ApiError.badRequest('Earn amount must be a positive integer');
    }

    if (idempotencyKey) {
      const existing = await client.query(
        `SELECT id FROM ledger
          WHERE entry_type = 'EARN' AND idempotency_key = $1 AND user_id = $2`,
        [idempotencyKey, userId]
      );
      if (existing.rows[0]) {
        return {
          entryId: existing.rows[0].id,
          wallet: await readWallet(client, userId),
          duplicate: true,
        };
      }
    }

    const wallet = await lockWallet(client, userId);
    const res = await client.query(
      `INSERT INTO ledger (user_id, amount, entry_type, reference_id, idempotency_key, description)
       VALUES ($1, $2, 'EARN', $3, $4, $5) RETURNING id`,
      [userId, amount, null, idempotencyKey ?? null, description]
    );
    await client.query(
      `UPDATE wallets
          SET balance = balance + $1,
              lifetime_earned = lifetime_earned + $1
        WHERE user_id = $2`,
      [amount, userId]
    );

    return {
      entryId: res.rows[0].id,
      wallet: {
        balance: wallet.balance + amount,
        lifetimeEarned: wallet.lifetimeEarned + amount,
        lifetimeSpent: wallet.lifetimeSpent,
      },
      duplicate: false,
    };
  },

  /**
   * Debit Sparks for a pending order. Fails when balance is insufficient.
   * At most one RESERVE per order (enforced by unique partial index).
   */
  async reserve(
    client: DBClient,
    userId: string,
    amount: number,
    orderId: string
  ): Promise<WalletState> {
    if (!Number.isInteger(amount) || amount < 0) {
      throw ApiError.badRequest('Reserve amount must be a non-negative integer');
    }
    if (amount === 0) return readWallet(client, userId);

    const wallet = await lockWallet(client, userId);
    if (wallet.balance < amount) {
      throw ApiError.insufficientSparks(amount, wallet.balance);
    }

    await client.query(
      `INSERT INTO ledger (user_id, amount, entry_type, reference_id, description)
       VALUES ($1, $2, 'RESERVE', $3, $4)`,
      [userId, -amount, orderId, 'Sparks reserved for order']
    );
    await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
      [amount, userId]
    );

    return { ...wallet, balance: wallet.balance - amount };
  },

  /** Finalize a reservation after payment success. Marks Sparks as spent. */
  async commit(
    client: DBClient,
    userId: string,
    amount: number,
    orderId: string
  ): Promise<WalletState> {
    if (amount === 0) return readWallet(client, userId);

    const wallet = await lockWallet(client, userId);
    await client.query(
      `INSERT INTO ledger (user_id, amount, entry_type, reference_id, description)
       VALUES ($1, 0, 'COMMIT', $2, $3)`,
      [userId, orderId, 'Order completed - Sparks spent']
    );
    await client.query(
      `UPDATE wallets SET lifetime_spent = lifetime_spent + $1 WHERE user_id = $2`,
      [amount, userId]
    );

    return { ...wallet, lifetimeSpent: wallet.lifetimeSpent + amount };
  },

  /** Return reserved Sparks to the wallet (payment failure / cancellation). */
  async release(
    client: DBClient,
    userId: string,
    amount: number,
    orderId: string
  ): Promise<WalletState> {
    if (amount === 0) return readWallet(client, userId);

    const wallet = await lockWallet(client, userId);
    await client.query(
      `INSERT INTO ledger (user_id, amount, entry_type, reference_id, description)
       VALUES ($1, $2, 'RELEASE', $3, $4)`,
      [userId, amount, orderId, 'Sparks restored - payment failed or cancelled']
    );
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
      [amount, userId]
    );

    return { ...wallet, balance: wallet.balance + amount };
  },

  /** Admin correction. Negative adjustments cannot overdraw the wallet. */
  async adjust(
    client: DBClient,
    userId: string,
    amount: number,
    description: string
  ): Promise<WalletState> {
    if (!Number.isInteger(amount) || amount === 0) {
      throw ApiError.badRequest('Adjustment amount must be a non-zero integer');
    }

    const wallet = await lockWallet(client, userId);
    const newBalance = wallet.balance + amount;
    if (newBalance < 0) {
      throw ApiError.unprocessable(
        `Adjustment would overdraw wallet (balance ${wallet.balance}, adjustment ${amount})`
      );
    }

    await client.query(
      `INSERT INTO ledger (user_id, amount, entry_type, description)
       VALUES ($1, $2, 'ADJUSTMENT', $3)`,
      [userId, amount, description]
    );
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
      [amount, userId]
    );

    return { ...wallet, balance: newBalance };
  },

  async getWallet(userId: string, client?: DBClient): Promise<WalletState> {
    const sql = `SELECT balance, lifetime_earned, lifetime_spent FROM wallets WHERE user_id = $1`;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    if (!res.rows[0]) return { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
    const row = res.rows[0];
    return {
      balance: row.balance,
      lifetimeEarned: Number(row.lifetime_earned),
      lifetimeSpent: Number(row.lifetime_spent),
    };
  },

  async listEntries(
    userId: string,
    opts: { limit: number; offset: number }
  ): Promise<{ entries: LedgerEntry[]; total: number }> {
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM ledger WHERE user_id = $1`,
      [userId]
    );
    const res = await query(
      `SELECT id, amount, entry_type AS "entryType", reference_id AS "referenceId",
              description, created_at AS "createdAt"
         FROM ledger WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3`,
      [userId, opts.limit, opts.offset]
    );
    return { entries: res.rows, total: countRes.rows[0].total };
  },
};
