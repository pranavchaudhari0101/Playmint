import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';
import type { AppEnv } from '../env';

const itemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(5),
  sparksApplied: z.number().int().min(0),
});

const quoteSchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
});

const createOrderSchema = z.object({
  items: z.array(itemSchema).min(1).max(10),
  shippingAddress: z
    .object({
      fullName: z.string().min(1).max(120),
      phone: z.string().min(6).max(20),
      line1: z.string().min(1).max(200),
      line2: z.string().max(200).optional(),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(100),
      pincode: z.string().min(4).max(10),
    })
    .optional(),
});

export const checkoutRouter = new Hono<AppEnv>();
checkoutRouter.use('*', authMiddleware);

/** Server-authoritative price + Spark-coverage quote. */
checkoutRouter.post('/quote', async (c) => {
  const { items } = await parseBody(c, quoteSchema);
  return c.json(await checkoutService.quote(c.get('userId'), items));
});

/** Creates the order, reserves Sparks, opens a payment intent when cash is due. */
checkoutRouter.post('/orders', async (c) => {
  const { items, shippingAddress } = await parseBody(c, createOrderSchema);
  const result = await checkoutService.createOrder(c.get('userId'), items, shippingAddress);
  return c.json(result, 201);
});
