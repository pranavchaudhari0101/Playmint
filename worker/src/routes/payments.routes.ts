import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config';
import { query } from '../db';
import { ApiError } from '../errors';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';
import { verifyRazorpayWebhook } from '../services/paymentService';
import type { AppEnv } from '../env';

const mockConfirmSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE']),
});

/**
 * ── Mock gateway ───────────────────────────────────────────────────
 * Simulates the provider callback: POST /api/payments/mock/:intentId
 * with {"outcome":"SUCCESS"} or {"outcome":"FAILURE"}. Only the order
 * owner (or an admin) can drive the simulation.
 *
 * ── Razorpay webhook (POST /api/payments/webhook/razorpay) ────────
 * Hono parses the body lazily, so the raw text is still available
 * for HMAC verification over the exact payload.
 * ──────────────────────────────────────────────────────────────────
 */
export const paymentsRouter = new Hono<AppEnv>();

paymentsRouter.post('/mock/:intentId', authMiddleware, async (c) => {
  const { intentId } = c.req.param();
  const { outcome } = await parseBody(c, mockConfirmSchema);

  const found = await query(
    `SELECT id, user_id AS "userId" FROM orders WHERE payment_intent_id = $1`,
    [intentId]
  );
  const order = found.rows[0];
  if (!order) throw ApiError.notFound('Payment intent not found');
  if (order.userId !== c.get('userId') && c.get('userRole') !== 'admin') {
    throw ApiError.forbidden();
  }

  const result =
    outcome === 'SUCCESS'
      ? await checkoutService.settleSuccess(order.id)
      : await checkoutService.settleFailure(order.id);

  return c.json(result);
});

paymentsRouter.post('/webhook/razorpay', async (c) => {
  if (config.payments.provider !== 'razorpay') {
    throw ApiError.notFound('Webhook not active for current payment provider');
  }

  const signature = c.req.header('x-razorpay-signature');
  const rawBody = await c.req.text();
  if (!signature || !(await verifyRazorpayWebhook(rawBody, signature))) {
    throw ApiError.unauthorized('Invalid webhook signature');
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { order_id?: string; status?: string } } };
  };
  const entity = event.payload?.payment?.entity;
  const intentId = entity?.order_id;

  if (intentId && (event.event === 'payment.captured' || entity?.status === 'captured')) {
    await checkoutService.settleSuccess((await checkoutService.getOrderByIntentId(intentId)).id);
  } else if (intentId && (event.event === 'payment.failed' || entity?.status === 'failed')) {
    await checkoutService.settleFailure((await checkoutService.getOrderByIntentId(intentId)).id);
  }

  return c.json({ received: true });
});
