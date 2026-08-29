import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import { config } from '../config';
import { query, withTransaction } from '../db';
import { ApiError } from '../errors';
import { ledgerService } from './ledgerService';

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  password_hash: string;
  role: 'user' | 'admin';
  display_name: string | null;
  created_at: Date;
}

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at.toISOString(),
  };
}

function signToken(user: { id: string; role: 'user' | 'admin' }): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export const authService = {
  async signup(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      throw ApiError.badRequest('Invalid email address');
    }
    if (password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters');
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existing.rows[0]) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { user, walletBalance } = await withTransaction(async (client: PoolClient) => {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name)
         VALUES ($1, $2, 'user', $3)
         RETURNING id, email, password_hash, role, display_name, created_at`,
        [normalizedEmail, passwordHash, displayName?.trim() || null]
      );
      const created = res.rows[0] as UserRow;

      let balance = 0;
      if (config.economy.welcomeBonusSparks > 0) {
        const result = await ledgerService.earn(
          client,
          created.id,
          config.economy.welcomeBonusSparks,
          'Welcome bonus'
        );
        balance = result.wallet.balance;
      }

      return { user: toPublic(created), walletBalance: balance };
    });

    return { user, token: signToken(user), walletBalance };
  },

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const res = await query(
      `SELECT id, email, password_hash, role, display_name, created_at
         FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    const user = res.rows[0] as UserRow | undefined;
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const publicUser = toPublic(user);
    const wallet = await ledgerService.getWallet(user.id);
    return { user: publicUser, token: signToken(publicUser), walletBalance: wallet.balance };
  },

  async getById(id: string): Promise<PublicUser | null> {
    const res = await query(
      `SELECT id, email, password_hash, role, display_name, created_at
         FROM users WHERE id = $1`,
      [id]
    );
    const user = res.rows[0] as UserRow | undefined;
    return user ? toPublic(user) : null;
  },
};
