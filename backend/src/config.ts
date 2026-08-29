import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  db: {
    user: required('DB_USER'),
    host: required('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: required('DB_NAME'),
    password: required('DB_PASSWORD'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  economy: {
    sparksPerRupee: 100,
    welcomeBonusSparks: parseInt(process.env.WELCOME_BONUS_SPARKS ?? '2500', 10),
    maxEarnPerEvent: parseInt(process.env.MAX_EARN_PER_EVENT ?? '2500', 10),
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'razorpay',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
};
