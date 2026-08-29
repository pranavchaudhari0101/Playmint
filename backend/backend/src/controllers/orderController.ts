import { Request, Response } from 'express';
import { query } from '../utils/db';
import { LedgerService } from '../services/ledgerService';
import { AuthRequest } from '../middleware/auth';

export class OrderController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { productId, sparksRedeemed, totalPrice, paymentMethod } = req.body;

      if (!productId || sparksRedeemed === undefined || !totalPrice) {
        return res.status(400).json({ error: 'Missing required order fields' });
      }

      // 1. Create Pending Order
      const orderRes = await query(
        `INSERT INTO orders (user_id, product_id, total_price, sparks_redeemed, status)
         VALUES ($1, $2, $3, $4, 'PENDING') RETURNING id`,
        [userId, productId, totalPrice, sparksRedeemed]
      );
      const orderId = orderRes.rows[0].id;

      // 2. Reserve Sparks
      await LedgerService.reserve(userId, sparksRedeemed, orderId);

      res.status(201).json({
        orderId,
        status: 'PENDING',
        message: 'Order reserved. Proceed to payment.'
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async settle(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { orderId, success } = req.body;

      const orderRes = await query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [orderId, userId]
      );

      if (orderRes.rowCount === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderRes.rows[0];
      if (order.status !== 'PENDING') {
        return res.status(400).json({ error: 'Order is already finalized' });
      }

      if (success) {
        // 3. Commit Sparks
        await LedgerService.commit(userId, order.sparks_redeemed, orderId);
        await query(
          'UPDATE orders SET status = \'COMPLETED\' WHERE id = $1',
          [orderId]
        );

        // Optional: Credit earn-back here if applicable
        // await LedgerService.earn(userId, earnBackAmount, 'PURCHASE_REWARD', orderId);

        res.json({ status: 'COMPLETED' });
      } else {
        // 4. Release Sparks
        await LedgerService.release(userId, order.sparks_redeemed, orderId);
        await query(
          'UPDATE orders SET status = \'CANCELLED\' WHERE id = $1',
          [orderId]
        );
        res.json({ status: 'CANCELLED' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const res = await query(
        `SELECT o.*, p.name as product_name
         FROM orders o
         JOIN products p ON o.product_id = p.id
         WHERE o.user_id = $1
         ORDER BY o.created_at DESC`,
        [userId]
      );
      res.json(res.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
