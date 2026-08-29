import { Router, Response } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { query } from '../db';
import { ApiError } from '../errors';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';
import { verifyRazorpayWebhook } from '../services/paymentService';

const mockConfirmSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE']),
});

/**
 * ── Mock gateway ───────────────────────────────────────────────────
 * Simulates the provider callback: POST /api/payments/mock/:intentId
 * with {"outcome":"SUCCESS"} or {"outcome":"FAILURE"}. Only the order
 * owner (or an admin) can drive the simulation.
 * ──────────────────────────────────────────────────────────────────
 */
export const paymentsRouter = Router();

paymentsRouter.post(
  '/mock/:intentId',
  authenticate,
  validateBody(mockConfirmSchema),
  async (req: AuthRequest, res: Response) => {
    const { intentId } = req.params;
    const { outcome } = req.body;

    const found = await query(
      `SELECT id, user_id AS "userId" FROM orders WHERE payment_intent_id = $1`,
      [intentId]
    );
    const order = found.rows[0];
    if (!order) throw ApiError.notFound('Payment intent not found');
    if (order.userId !== req.userId && req.userRole !== 'admin') {
      throw ApiError.forbidden();
    }

    const result =
      outcome === 'SUCCESS'
        ? await checkoutService.settleSuccess(order.id)
        : await checkoutService.settleFailure(order.id);

    res.json(result);
  }
);

/**
 * ── Razorpay webhook ───────────────────────────────────────────────
 * Mounted with express.raw so the HMAC covers the exact payload.
 * Signature: x-razorpay-signature header, verified against
 * RAZORPAY_WEBHOOK_SECRET. Handles payment.captured / payment.failed.
 * ──────────────────────────────────────────────────────────────────
 */
export const webhookRouter = Router();

webhookRouter.post('/razorpay', async (req, res: Response) => {
  if (config.payments.provider !== 'razorpay') {
    throw ApiError.notFound('Webhook not active for current payment provider');
  }

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const rawBody = (req as { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
  if (!signature || !verifyRazorpayWebhook(rawBody, signature)) {
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

  res.json({ received: true });
});
