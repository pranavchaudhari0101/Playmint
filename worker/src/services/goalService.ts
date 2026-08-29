import { query, withTransaction } from '../db';
import { ApiError } from '../errors';

export interface GoalView {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  targetSparks: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'DROPPED';
  progressSparks: number;
  remainingSparks: number;
  createdAt: string;
}

export const goalService = {
  async setActive(userId: string, productId: string, walletBalance: number): Promise<GoalView> {
    return withTransaction(async (client) => {
      const productRes = await client.query(
        `SELECT id, name, image_url AS "imageUrl", max_sparks AS "maxSparks", cash_price_paise AS "cashPricePaise"
           FROM products WHERE id = $1 AND is_active = true`,
        [productId]
      );
      const product = productRes.rows[0];
      if (!product) throw ApiError.notFound('Product not found');

      const target = product.cashPricePaise === 0 ? product.maxSparks : product.maxSparks;
      if (target <= 0) throw ApiError.unprocessable('This product cannot be set as a goal');

      await client.query(
        `UPDATE goals SET status = 'DROPPED' WHERE user_id = $1 AND status = 'ACTIVE'`,
        [userId]
      );
      const res = await client.query(
        `INSERT INTO goals (user_id, product_id, target_sparks)
         VALUES ($1, $2, $3)
         RETURNING id, target_sparks AS "targetSparks", status, created_at AS "createdAt"`,
        [userId, productId, target]
      );
      const goal = res.rows[0];

      return {
        id: goal.id,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        targetSparks: goal.targetSparks,
        status: goal.status,
        progressSparks: Math.min(walletBalance, goal.targetSparks),
        remainingSparks: Math.max(goal.targetSparks - walletBalance, 0),
        createdAt: goal.createdAt,
      };
    });
  },

  async getActive(userId: string, walletBalance: number): Promise<GoalView | null> {
    const res = await query(
      `SELECT g.id, g.target_sparks AS "targetSparks", g.status, g.created_at AS "createdAt",
              p.id AS "productId", p.name AS "productName", p.image_url AS "productImage"
         FROM goals g JOIN products p ON p.id = g.product_id
        WHERE g.user_id = $1 AND g.status = 'ACTIVE'
        ORDER BY g.created_at DESC LIMIT 1`,
      [userId]
    );
    const goal = res.rows[0];
    if (!goal) return null;
    return {
      ...goal,
      progressSparks: Math.min(walletBalance, goal.targetSparks),
      remainingSparks: Math.max(goal.targetSparks - walletBalance, 0),
    };
  },

  async dropActive(userId: string): Promise<void> {
    await query(
      `UPDATE goals SET status = 'DROPPED' WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
  },
};
