import { config } from '../config';
import { query, withTransaction, DBClient } from '../db';
import { ledgerService } from './ledgerService';

export interface PublicUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string | null;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  display_name: string | null;
  clerk_user_id: string | null;
  created_at: Date;
}

const USER_COLUMNS = 'id, email, role, display_name, clerk_user_id, created_at';

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * Identity lives in Clerk; this service keeps the local users row in sync.
 * Resolution order on first sight of a Clerk user:
 *   1. an existing row already linked via clerk_user_id,
 *   2. an existing row with the same email (seeded demo accounts keep
 *      their wallets and history) — linked in place,
 *   3. a brand-new row, granted the welcome bonus atomically.
 */
export const authService = {
  async findByClerkId(clerkUserId: string): Promise<PublicUser | null> {
    const res = await query(`SELECT ${USER_COLUMNS} FROM users WHERE clerk_user_id = $1`, [
      clerkUserId,
    ]);
    const row = res.rows[0] as UserRow | undefined;
    return row ? toPublic(row) : null;
  },

  async linkByEmail(clerkUserId: string, email: string): Promise<PublicUser | null> {
    const res = await query(
      `UPDATE users SET clerk_user_id = $1
       WHERE email = $2 AND clerk_user_id IS NULL
       RETURNING ${USER_COLUMNS}`,
      [clerkUserId, email],
    );
    if (res.rows[0]) return toPublic(res.rows[0] as UserRow);

    // No unlinked row with that email. If one is already linked (concurrent
    // request), just return it.
    const existing = await query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email]);
    const row = existing.rows[0] as UserRow | undefined;
    return row ? toPublic(row) : null;
  },

  async createClerkUser(
    clerkUserId: string,
    email: string,
    displayName: string | null,
  ): Promise<PublicUser> {
    try {
      return await withTransaction(async (client: DBClient) => {
        const res = await client.query(
          `INSERT INTO users (email, password_hash, role, display_name, clerk_user_id)
           VALUES ($1, NULL, 'user', $2, $3)
           RETURNING ${USER_COLUMNS}`,
          [email, displayName, clerkUserId],
        );
        const row = res.rows[0] as UserRow;

        if (config.economy.welcomeBonusSparks > 0) {
          await ledgerService.earn(
            client,
            row.id,
            config.economy.welcomeBonusSparks,
            'Welcome bonus',
            `provision:welcome:${clerkUserId}`,
          );
        }

        return toPublic(row);
      });
    } catch (err) {
      // A concurrent first request may have provisioned this user already.
      const existing = await authService.findByClerkId(clerkUserId);
      if (existing) return existing;
      throw err;
    }
  },

  async resolveFromClerk(
    clerkUserId: string,
    email: string,
    displayName: string | null,
  ): Promise<PublicUser> {
    const byId = await authService.findByClerkId(clerkUserId);
    if (byId) return byId;

    const linked = await authService.linkByEmail(clerkUserId, email);
    if (linked) return linked;

    return authService.createClerkUser(clerkUserId, email, displayName);
  },
};
