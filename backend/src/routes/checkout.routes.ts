import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { checkoutService } from '../services/checkoutService';

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

export const checkoutRouter = Router();
checkoutRouter.use(authenticate);

/** Server-authoritative price + Spark-coverage quote. */
checkoutRouter.post('/quote', validateBody(quoteSchema), async (req: AuthRequest, res: Response) => {
  res.json(await checkoutService.quote(req.userId!, req.body.items));
});

/** Creates the order, reserves Sparks, opens a payment intent when cash is due. */
checkoutRouter.post('/orders', validateBody(createOrderSchema), async (req: AuthRequest, res: Response) => {
  const { items, shippingAddress } = req.body;
  const result = await checkoutService.createOrder(req.userId!, items, shippingAddress);
  res.status(201).json(result);
});
