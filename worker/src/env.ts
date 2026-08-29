/** Cloudflare Worker bindings (vars + secrets). */
export interface Env {
  /** Neon connection string (secret). Use the DIRECT endpoint — WebSocket transactions. */
  DATABASE_URL: string;
  /** Clerk secret key (secret). */
  CLERK_SECRET_KEY: string;
  /** Comma-separated frontend origins — Clerk azp check AND CORS allow-list. */
  CLERK_AUTHORIZED_PARTIES?: string;
  NODE_ENV?: string;
  WELCOME_BONUS_SPARKS?: string;
  MAX_EARN_PER_EVENT?: string;
  PAYMENT_PROVIDER?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}

/** Per-request context set by the auth middleware. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    userRole: 'user' | 'admin';
  };
};
