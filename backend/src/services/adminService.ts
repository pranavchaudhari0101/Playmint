import { PoolClient } from 'pg';
import { query, withTransaction } from '../db';
import { ApiError } from '../errors';
import { ledgerService } from './ledgerService';

/**
 * ─── Admin Service ─────────────────────────────────────────────────
 * Catalog management (products, categories), order fulfilment,
 * ledger audit and balance adjustments. All mutations are regular
 * users' data changes — they happen in normal transactions and are
 * fully auditable via the ledger.
 * ──────────────────────────────────────────────────────────────────
 */

export interface AdminProductInput {
  categoryId?: string | null;
  sku?: string;
  name?: string;
  description?: string | null;
  cashPricePaise?: number;
  maxSparks?: number;
  earnbackSparks?: number;
  imageUrl?: string | null;
  tags?: string[];
  stock?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export const adminService = {
  // ── Products ──────────────────────────────────────────────────────
  async listProducts(opts: { limit: number; offset: number; includeInactive: boolean }) {
    const where = opts.includeInactive ? 'TRUE' : 'p.is_active = true';
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`
    );
    const res = await query(
      `SELECT p.id, p.category_id AS "categoryId", c.name AS "categoryName", p.sku, p.name,
              p.description, p.cash_price_paise AS "cashPricePaise", p.max_sparks AS "maxSparks",
              p.earnback_sparks AS "earnbackSparks", p.image_url AS "imageUrl", p.tags,
              p.stock, p.is_active AS "isActive", p.sort_order AS "sortOrder",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt"
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${where}
        ORDER BY p.sort_order, p.created_at DESC
        LIMIT $1 OFFSET $2`,
      [opts.limit, opts.offset]
    );
    return { products: res.rows, total: countRes.rows[0].total };
  },

  async createProduct(input: AdminProductInput & { sku: string; name: string }) {
    const dupe = await query(`SELECT id FROM products WHERE sku = $1`, [input.sku]);
    if (dupe.rows[0]) throw ApiError.conflict(`SKU "${input.sku}" already exists`);

    if ((input.cashPricePaise ?? 1) === 0 && (input.maxSparks ?? 0) <= 0) {
      throw ApiError.unprocessable('Sparks-only products need maxSparks > 0');
    }

    const res = await query(
      `INSERT INTO products
         (category_id, sku, name, description, cash_price_paise, max_sparks,
          earnback_sparks, image_url, tags, stock, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        input.categoryId ?? null,
        input.sku,
        input.name,
        input.description ?? null,
        input.cashPricePaise ?? 0,
        input.maxSparks ?? 0,
        input.earnbackSparks ?? 0,
        input.imageUrl ?? null,
        input.tags ?? [],
        input.stock ?? null,
        input.isActive ?? true,
        input.sortOrder ?? 0,
      ]
    );
    return { id: res.rows[0].id };
  },

  async updateProduct(id: string, input: AdminProductInput) {
    const existing = await query(`SELECT id FROM products WHERE id = $1`, [id]);
    if (!existing.rows[0]) throw ApiError.notFound('Product not found');

    const sets: string[] = [];
    const params: unknown[] = [id];
    const fieldMap: Array<[keyof AdminProductInput, string]> = [
      ['categoryId', 'category_id'],
      ['name', 'name'],
      ['description', 'description'],
      ['cashPricePaise', 'cash_price_paise'],
      ['maxSparks', 'max_sparks'],
      ['earnbackSparks', 'earnback_sparks'],
      ['imageUrl', 'image_url'],
      ['tags', 'tags'],
      ['stock', 'stock'],
      ['isActive', 'is_active'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [key, column] of fieldMap) {
      const value = input[key];
      if (value !== undefined) {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) throw ApiError.badRequest('No fields to update');

    await query(`UPDATE products SET ${sets.join(', ')} WHERE id = $1`, params);
    return { id };
  },

  async deleteProduct(id: string) {
    // Soft delete keeps order history referentially intact.
    const res = await query(`UPDATE products SET is_active = false WHERE id = $1 RETURNING id`, [id]);
    if (!res.rows[0]) throw ApiError.notFound('Product not found');
    return { id };
  },

  // ── Categories ────────────────────────────────────────────────────
  async listCategories() {
    const res = await query(
      `SELECT c.id, c.name, c.slug, c.sort_order AS "sortOrder", c.is_active AS "isActive",
              (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id) AS "productCount"
         FROM categories c ORDER BY c.sort_order, c.name`
    );
    return res.rows;
  },

  async createCategory(input: { name: string; slug: string; sortOrder?: number }) {
    const dupe = await query(`SELECT id FROM categories WHERE slug = $1`, [input.slug]);
    if (dupe.rows[0]) throw ApiError.conflict(`Slug "${input.slug}" already exists`);
    const res = await query(
      `INSERT INTO categories (name, slug, sort_order) VALUES ($1,$2,$3) RETURNING id`,
      [input.name, input.slug, input.sortOrder ?? 0]
    );
    return { id: res.rows[0].id };
  },

  async updateCategory(id: string, input: { name?: string; sortOrder?: number; isActive?: boolean }) {
    const sets: string[] = [];
    const params: unknown[] = [id];
    if (input.name !== undefined) {
      params.push(input.name);
      sets.push(`name = $${params.length}`);
    }
    if (input.sortOrder !== undefined) {
      params.push(input.sortOrder);
      sets.push(`sort_order = $${params.length}`);
    }
    if (input.isActive !== undefined) {
      params.push(input.isActive);
      sets.push(`is_active = $${params.length}`);
    }
    if (sets.length === 0) throw ApiError.badRequest('No fields to update');
    const res = await query(
      `UPDATE categories SET ${sets.join(', ')} WHERE id = $1 RETURNING id`,
      params
    );
    if (!res.rows[0]) throw ApiError.notFound('Category not found');
    return { id };
  },

  // ── Orders ────────────────────────────────────────────────────────
  async listOrders(opts: {
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ orders: unknown[]; total: number }> {
    const params: unknown[] = [];
    let where = 'TRUE';
    if (opts.status) {
      params.push(opts.status);
      where = `o.status = $${params.length}::order_status`;
    }
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM orders o WHERE ${where}`, params);
    const res = await query(
      `SELECT o.id, o.status, o.cash_total_paise AS "cashTotalPaise",
              o.sparks_total AS "sparksTotal", o.earnback_sparks AS "earnbackSparks",
              o.payment_provider AS "paymentProvider", o.created_at AS "createdAt",
              u.email AS "userEmail", u.display_name AS "userName",
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS "itemCount"
         FROM orders o JOIN users u ON u.id = o.user_id
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, opts.offset]
    );
    return { orders: res.rows, total: countRes.rows[0].total };
  },

  async updateOrderStatus(id: string, status: 'FULFILLED' | 'CANCELLED') {
    return withTransaction(async (client: PoolClient) => {
      const res = await client.query(
        `SELECT user_id AS "userId", status, sparks_total AS "sparksTotal"
           FROM orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const order = res.rows[0];
      if (!order) throw ApiError.notFound('Order not found');

      if (status === 'FULFILLED') {
        if (order.status !== 'PAID') {
          throw ApiError.conflict('Only paid orders can be fulfilled');
        }
        await client.query(`UPDATE orders SET status = 'FULFILLED' WHERE id = $1`, [id]);
      } else {
        if (order.status !== 'PENDING_PAYMENT') {
          throw ApiError.conflict('Only pending orders can be cancelled');
        }
        await ledgerService.release(client, order.userId, order.sparksTotal, id);
        await client.query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [id]);
      }
      return { id, status };
    });
  },

  // ── Ledger audit & adjustments ───────────────────────────────────
  async listLedger(opts: { userId?: string; limit: number; offset: number }) {
    const params: unknown[] = [];
    let where = 'TRUE';
    if (opts.userId) {
      params.push(opts.userId);
      where = `l.user_id = $${params.length}`;
    }
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM ledger l WHERE ${where}`, params);
    const res = await query(
      `SELECT l.id, l.user_id AS "userId", u.email AS "userEmail",
              l.amount, l.entry_type AS "entryType", l.reference_id AS "referenceId",
              l.idempotency_key AS "idempotencyKey", l.description,
              l.created_at AS "createdAt"
         FROM ledger l JOIN users u ON u.id = l.user_id
        WHERE ${where}
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, opts.offset]
    );
    return { entries: res.rows, total: countRes.rows[0].total };
  },

  async adjustBalance(userId: string, amount: number, description: string) {
    const user = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
    if (!user.rows[0]) throw ApiError.notFound('User not found');

    return withTransaction(async (client: PoolClient) => {
      const wallet = await ledgerService.adjust(client, userId, amount, description);
      return { wallet };
    });
  },

  // ── Users & stats ─────────────────────────────────────────────────
  async listUsers(opts: { limit: number; offset: number; search?: string }) {
    const params: unknown[] = [];
    let where = 'TRUE';
    if (opts.search) {
      params.push(`%${opts.search.toLowerCase()}%`);
      where = `LOWER(u.email) LIKE $${params.length} OR LOWER(u.display_name) LIKE $${params.length}`;
    }
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM users u WHERE ${where}`, params);
    const res = await query(
      `SELECT u.id, u.email, u.role, u.display_name AS "displayName", u.created_at AS "createdAt",
              COALESCE(w.balance, 0) AS "balance",
              COALESCE(w.lifetime_earned, 0) AS "lifetimeEarned",
              COALESCE(w.lifetime_spent, 0) AS "lifetimeSpent",
              (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = u.id) AS "orderCount"
         FROM users u LEFT JOIN wallets w ON w.user_id = u.id
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, opts.offset]
    );
    return { users: res.rows, total: countRes.rows[0].total };
  },

  async getStats() {
    const res = await query(
      `SELECT
        (SELECT COUNT(*)::int FROM users) AS "totalUsers",
        (SELECT COUNT(*)::int FROM users WHERE created_at > now() - interval '7 days') AS "newUsers7d",
        (SELECT COUNT(*)::int FROM orders WHERE status IN ('PAID','FULFILLED')) AS "paidOrders",
        (SELECT COUNT(*)::int FROM orders WHERE status = 'PENDING_PAYMENT') AS "pendingOrders",
        (SELECT COALESCE(SUM(cash_total_paise),0)::bigint FROM orders WHERE status IN ('PAID','FULFILLED')) AS "gmvPaise",
        (SELECT COALESCE(SUM(sparks_total),0)::bigint FROM orders WHERE status IN ('PAID','FULFILLED')) AS "sparksSpent",
        (SELECT COALESCE(SUM(earnback_sparks),0)::bigint FROM orders WHERE status IN ('PAID','FULFILLED')) AS "earnbackCredited",
        (SELECT COALESCE(SUM(lifetime_earned),0)::bigint FROM wallets) AS "sparksIssued",
        (SELECT COALESCE(SUM(balance),0)::bigint FROM wallets) AS "sparksOutstanding",
        (SELECT COUNT(*)::int FROM products WHERE is_active = true) AS "activeProducts"`
    );
    return res.rows[0];
  },
};
