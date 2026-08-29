import crypto from 'crypto';
import { config } from '../config';
import { ApiError } from '../errors';

/**
 * ─── Payment Provider Abstraction ──────────────────────────────────
 * A payment provider creates an "intent" (gateway-side order) for a
 * cash amount and can later be confirmed (webhook / client callback).
 *
 *  - MockProvider: simulated gateway for development/demo. Intents are
 *    confirmed via POST /api/payments/mock/:intentId with an outcome.
 *  - RazorpayProvider: real gateway. Creates orders via the Razorpay
 *    Orders API; payments are confirmed through the signed webhook.
 *    Activated automatically when RAZORPAY_KEY_ID/SECRET are present.
 * ──────────────────────────────────────────────────────────────────
 */

export interface CreateIntentInput {
  orderId: string;
  amountPaise: number;
  receipt: string;
}

export interface PaymentIntent {
  intentId: string;
  provider: string;
  amountPaise: number;
  /** Payload the client SDK needs to open the gateway checkout. */
  clientPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
}

export const mockProvider: PaymentProvider = {
  name: 'mock',

  async createIntent(input) {
    const intentId = `mockpay_${crypto.randomUUID()}`;
    return {
      intentId,
      provider: this.name,
      amountPaise: input.amountPaise,
      clientPayload: {
        gatewayUrl: `/api/payments/mock/${intentId}`,
        instructions: 'Simulated gateway. POST to gatewayUrl with {"outcome":"SUCCESS"|"FAILURE"}.',
      },
    };
  },
};

export const razorpayProvider: PaymentProvider = {
  name: 'razorpay',

  async createIntent(input) {
    if (!config.payments.razorpayKeyId || !config.payments.razorpayKeySecret) {
      throw new ApiError(500, 'PAYMENT_CONFIG', 'Razorpay keys are not configured');
    }
    const auth = Buffer.from(
      `${config.payments.razorpayKeyId}:${config.payments.razorpayKeySecret}`
    ).toString('base64');

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: 'INR',
        receipt: input.receipt,
        notes: { orderId: input.orderId },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(502, 'PAYMENT_GATEWAY_ERROR', `Razorpay order creation failed`, {
        status: res.status,
        body,
      });
    }

    const order = (await res.json()) as { id: string; amount: number };
    return {
      intentId: order.id,
      provider: this.name,
      amountPaise: order.amount,
      clientPayload: {
        keyId: config.payments.razorpayKeyId,
        gatewayOrderId: order.id,
        amount: order.amount,
        currency: 'INR',
      },
    };
  },
};

export function getPaymentProvider(): PaymentProvider {
  if (config.payments.provider === 'razorpay') return razorpayProvider;
  return mockProvider;
}

/** Verifies the Razorpay webhook HMAC signature (x-razorpay-signature). */
export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = config.payments.razorpayWebhookSecret;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
