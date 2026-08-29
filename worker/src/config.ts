import type { Env } from './env';

/**
 * Workers don't have `process.env`; bindings arrive per-request. Services
 * throughout the codebase read the `config` object directly, so it is a
 * module-level mutable object initialized (once) by the first request
 * via `initConfig(c.env)`.
 */

export interface WorkerConfig {
  env: string;
  db: { connectionString: string };
  clerk: {
    secretKey: string;
    /** Frontend origins — used for the Clerk `azp` check and CORS. */
    authorizedParties: string[];
  };
  economy: {
    sparksPerRupee: number;
    welcomeBonusSparks: number;
    maxEarnPerEvent: number;
  };
  payments: {
    provider: 'mock' | 'razorpay';
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
  };
}

export const config: WorkerConfig = {
  env: 'development',
  db: { connectionString: '' },
  clerk: { secretKey: '', authorizedParties: [] },
  economy: { sparksPerRupee: 100, welcomeBonusSparks: 2500, maxEarnPerEvent: 2500 },
  payments: { provider: 'mock', razorpayKeyId: '', razorpayKeySecret: '', razorpayWebhookSecret: '' },
};

let initialized = false;

export function initConfig(env: Env): void {
  if (initialized) return;

  config.env = env.NODE_ENV ?? 'development';
  config.db.connectionString = env.DATABASE_URL;
  config.clerk.secretKey = env.CLERK_SECRET_KEY;
  config.clerk.authorizedParties = (env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  config.economy.welcomeBonusSparks = parseInt(env.WELCOME_BONUS_SPARKS ?? '2500', 10);
  config.economy.maxEarnPerEvent = parseInt(env.MAX_EARN_PER_EVENT ?? '2500', 10);
  config.payments.provider = (env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'razorpay';
  config.payments.razorpayKeyId = env.RAZORPAY_KEY_ID ?? '';
  config.payments.razorpayKeySecret = env.RAZORPAY_KEY_SECRET ?? '';
  config.payments.razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET ?? '';

  initialized = true;
}
