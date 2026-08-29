import { query, withTransaction, DBClient } from '../db';
import { ApiError } from '../errors';
import { catalogService, Product } from './catalogService';
import { ledgerService, WalletState } from './ledgerService';
import { getPaymentProvider, PaymentIntent } from './paymentService';


/**
 * ─── Checkout Service ──────────────────────────────────────────────
 * Server-authoritative pricing. The client only sends product ids,
 * quantities and desired Spark allocation; every price, cap and
 * total is computed from the database. Sparks-only products must be
 * paid entirely with Sparks; hybrid products allow 0..min(maxSparks,
 * cashPrice) Sparks with the remainder in cash.
 * ──────────────────────────────────────────────────────────────────
 */

export interface QuoteItemInput {
  productId: string;
  qty: number;
  sparksApplied: number;
}

export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  qty: number;
  unitPricePaise: number;
  maxSparks: number;
  isSparksOnly: boolean;
  sparksApplied: number;
  lineCashPaise: number;
  lineSparks: number;
  earnbackSparks: number;
}

export interface Quote {
  lines: QuoteLine[];
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  walletBalance: number;
  sufficientBalance: boolean;
}

export interface OrderItemView {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  qty: number;
  unitPricePaise: number;
  sparksApplied: number;
  lineCashPaise: number;
  lineSparks: number;
}

export interface OrderView {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED';
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  paymentProvider: string | null;
  paymentIntentId: string | null;
  paymentClientPayload: Record<string, unknown> | null;
  shippingAddress: Record<string, unknown> | null;
  items: OrderItemView[];
  createdAt: string;
  updatedAt: string;
}

const MAX_QTY_PER_LINE = 5;
const MAX_LINES = 10;

function computeLine(product: Product, qty: number, sparksApplied: number): QuoteLine {
  const isSparksOnly = product.cashPricePaise === 0;
  const lineCashBefore = product.cashPricePaise * qty;
  const lineMaxSparks = isSparksOnly
    ? product.maxSparks * qty
    : Math.min(product.maxSparks * qty, lineCashBefore);

  if (isSparksOnly && sparksApplied !== lineMaxSparks) {
    throw ApiError.unprocessable(
      `${product.name} is a Sparks-only product and requires exactly ${lineMaxSparks} Sparks`,
      { productId: product.id, requiredSparks: lineMaxSparks }
    );
  }
  if (sparksApplied < 0 || sparksApplied > lineMaxSparks) {
    throw ApiError.unprocessable(
      `Spark allocation for ${product.name} must be between 0 and ${lineMaxSparks}`,
      { productId: product.id, maxSparks: lineMaxSparks }
    );
  }

  const lineCash = isSparksOnly ? 0 : lineCashBefore - sparksApplied;
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    imageUrl: product.imageUrl,
    qty,
    unitPricePaise: product.cashPricePaise,
    maxSparks: product.maxSparks,
    isSparksOnly,
    sparksApplied,
    lineCashPaise: lineCash,
    lineSparks: sparksApplied,
    earnbackSparks: product.earnbackSparks * qty,
  };
}

async function buildLines(items: QuoteItemInput[]): Promise<QuoteLine[]> {
  if (items.length === 0) throw ApiError.badRequest('Cart is empty');
  if (items.length > MAX_LINES) throw ApiError.badRequest(`At most ${MAX_LINES} items per order`);

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.productId)) {
      throw ApiError.badRequest('Duplicate product in cart — merge quantities instead');
    }
    seen.add(item.productId);
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > MAX_QTY_PER_LINE) {
      throw ApiError.badRequest(`Quantity must be between 1 and ${MAX_QTY_PER_LINE}`);
    }
    if (!Number.isInteger(item.sparksApplied) || item.sparksApplied < 0) {
      throw ApiError.badRequest('Spark allocation must be a non-negative integer');
    }
  }

  const products = await catalogService.getProductsByIds(items.map((i) => i.productId));
  const lines: QuoteLine[] = [];
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product || !product.isActive) {
      throw ApiError.unprocessable(`Product ${item.productId} is not available`);
    }
    if (product.stock !== null && product.stock < item.qty) {
      throw ApiError.unprocessable(`Insufficient stock for ${product.name}`, {
        productId: product.id,
        stock: product.stock,
      });
    }
    lines.push(computeLine(product, item.qty, item.sparksApplied));
  }
  return lines;
}

function totals(lines: QuoteLine[]) {
  return {
    cashTotalPaise: lines.reduce((s, l) => s + l.lineCashPaise, 0),
    sparksTotal: lines.reduce((s, l) => s + l.lineSparks, 0),
    earnbackSparks: lines.reduce((s, l) => s + l.earnbackSparks, 0),
  };
}

export const checkoutService = {
  async quote(userId: string, items: QuoteItemInput[]): Promise<Quote> {
    const lines = await buildLines(items);
    const t = totals(lines);
    const wallet = await ledgerService.getWallet(userId);
    return {
      lines,
      ...t,
      walletBalance: wallet.balance,
      sufficientBalance: wallet.balance >= t.sparksTotal,
    };
  },

  /**
   * Creates an order, reserves Sparks, and opens a payment intent when
   * cash is due. Orders fully covered by Sparks are settled instantly.
   */
  async createOrder(
    userId: string,
    items: QuoteItemInput[],
    shippingAddress?: Record<string, unknown>
  ): Promise<{ order: OrderView; wallet: WalletState; intent: PaymentIntent | null }> {
    const lines = await buildLines(items);
    const t = totals(lines);

    const requiresShipping = lines.some((l) => !l.isSparksOnly);
    if (requiresShipping && !shippingAddress) {
      throw ApiError.badRequest('Shipping address is required for physical items');
    }

    const provider = getPaymentProvider();

    return withTransaction(async (client) => {
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, status, cash_total_paise, sparks_total, earnback_sparks, shipping_address)
         VALUES ($1, 'PENDING_PAYMENT', $2, $3, $4, $5)
         RETURNING id`,
        [userId, t.cashTotalPaise, t.sparksTotal, t.earnbackSparks, shippingAddress ?? null]
      );
      const orderId = orderRes.rows[0].id;

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, product_name, product_sku, image_url, qty,
              unit_price_paise, max_sparks, sparks_applied, line_cash_paise, line_sparks, earnback_sparks)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            orderId,
            line.productId,
            line.name,
            line.sku,
            line.imageUrl,
            line.qty,
            line.unitPricePaise,
            line.maxSparks,
            line.sparksApplied,
            line.lineCashPaise,
            line.lineSparks,
            line.earnbackSparks,
          ]
        );
      }

      // Reserve Sparks against the real order id. Throws (and rolls the whole
      // transaction back, including the order) when balance is insufficient.
      await ledgerService.reserve(client, userId, t.sparksTotal, orderId);

      let intent: PaymentIntent | null = null;
      if (t.cashTotalPaise > 0) {
        intent = await provider.createIntent({
          orderId,
          amountPaise: t.cashTotalPaise,
          receipt: `ord_${orderId.slice(0, 8)}`,
        });
        await client.query(
          `UPDATE orders SET payment_provider = $1, payment_intent_id = $2 WHERE id = $3`,
          [intent.provider, intent.intentId, orderId]
        );
      }

      let order = await getOrderInView(client, orderId);

      if (t.cashTotalPaise === 0) {
        // Fully covered by Sparks — settle immediately.
        order = await this.settleSuccessTx(client, order);
      }

      return { order, wallet: await ledgerService.getWallet(userId, client), intent };
    });
  },

  /** Marks the order paid: commits Sparks, credits earn-back, decrements stock. */
  async settleSuccess(orderId: string): Promise<{ order: OrderView; wallet: WalletState }> {
    return withTransaction(async (client) => {
      const order = await lockOrder(client, orderId);
      if (order.status !== 'PENDING_PAYMENT') {
        throw ApiError.conflict(`Order is already ${order.status}`);
      }
      return {
        order: await this.settleSuccessTx(client, order),
        wallet: await ledgerService.getWallet(order.userId, client),
      };
    });
  },

  async settleSuccessTx(client: DBClient, order: OrderView & { userId: string }): Promise<OrderView & { userId: string }> {
    // Commit spent Sparks (moves lifetime_spent).
    await ledgerService.commit(client, order.userId, order.sparksTotal, order.id);

    // Credit earn-back Sparks (idempotent per order).
    if (order.earnbackSparks > 0) {
      await ledgerService.earn(
        client,
        order.userId,
        order.earnbackSparks,
        'Earn-back bonus for purchase',
        `earnback:${order.id}`
      );
    }

    // Decrement stock.
    const items = await client.query(
      `SELECT product_id AS "productId", qty FROM order_items WHERE order_id = $1`,
      [order.id]
    );
    for (const item of items.rows) {
      await client.query(
        `UPDATE products
            SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - $1 END
          WHERE id = $2`,
        [item.qty, item.productId]
      );
    }

    await client.query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [order.id]);
    return { ...order, status: 'PAID' };
  },

  /** Marks the order failed and restores reserved Sparks. */
  async settleFailure(orderId: string): Promise<{ order: OrderView; wallet: WalletState }> {
    return withTransaction(async (client) => {
      const order = await lockOrder(client, orderId);
      if (order.status !== 'PENDING_PAYMENT') {
        throw ApiError.conflict(`Order is already ${order.status}`);
      }

      await ledgerService.release(client, order.userId, order.sparksTotal, order.id);
      await client.query(`UPDATE orders SET status = 'FAILED' WHERE id = $1`, [order.id]);

      return {
        order: { ...order, status: 'FAILED' },
        wallet: await ledgerService.getWallet(order.userId, client),
      };
    });
  },

  async cancelOrder(userId: string, orderId: string): Promise<{ order: OrderView; wallet: WalletState }> {
    return withTransaction(async (client) => {
      const order = await lockOrder(client, orderId);
      if (order.userId !== userId) throw ApiError.notFound('Order not found');
      if (order.status !== 'PENDING_PAYMENT') {
        throw ApiError.conflict(`Only pending orders can be cancelled (current: ${order.status})`);
      }

      await ledgerService.release(client, order.userId, order.sparksTotal, order.id);
      await client.query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [order.id]);

      return {
        order: { ...order, status: 'CANCELLED' },
        wallet: await ledgerService.getWallet(order.userId, client),
      };
    });
  },

  async listOrders(userId: string, opts: { limit: number; offset: number }) {
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1`,
      [userId]
    );
    const res = await query(
      `SELECT id, status, cash_total_paise AS "cashTotalPaise", sparks_total AS "sparksTotal",
              earnback_sparks AS "earnbackSparks", created_at AS "createdAt"
         FROM orders WHERE user_id = $1
        ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, opts.limit, opts.offset]
    );
    return { orders: res.rows, total: countRes.rows[0].total };
  },

  async getOrder(userId: string, orderId: string): Promise<OrderView> {
    const res = await query(`SELECT user_id AS "userId" FROM orders WHERE id = $1`, [orderId]);
    if (!res.rows[0] || res.rows[0].userId !== userId) throw ApiError.notFound('Order not found');
    return getOrderView(orderId);
  },

  async getOrderByIntentId(intentId: string): Promise<OrderView> {
    const res = await query(`SELECT id FROM orders WHERE payment_intent_id = $1`, [intentId]);
    if (!res.rows[0]) throw ApiError.notFound('Order not found for this payment intent');
    return getOrderView(res.rows[0].id);
  },
};

// ─── internal helpers ───────────────────────────────────────────────

async function lockOrder(client: DBClient, orderId: string): Promise<OrderView & { userId: string }> {
  const res = await client.query(
    `SELECT id, user_id AS "userId", status,
            cash_total_paise AS "cashTotalPaise", sparks_total AS "sparksTotal",
            earnback_sparks AS "earnbackSparks", payment_provider AS "paymentProvider",
            payment_intent_id AS "paymentIntentId", shipping_address AS "shippingAddress",
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId]
  );
  if (!res.rows[0]) throw ApiError.notFound('Order not found');
  return res.rows[0];
}

async function getOrderInView(client: DBClient, orderId: string): Promise<OrderView & { userId: string }> {
  const res = await client.query(
    `SELECT id, user_id AS "userId", status, cash_total_paise AS "cashTotalPaise",
            sparks_total AS "sparksTotal", earnback_sparks AS "earnbackSparks",
            payment_provider AS "paymentProvider", payment_intent_id AS "paymentIntentId",
            shipping_address AS "shippingAddress",
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM orders WHERE id = $1`,
    [orderId]
  );
  const order = res.rows[0];
  order.items = await getOrderItems(client, orderId);
  return order;
}

export async function getOrderView(orderId: string): Promise<OrderView> {
  const res = await query(
    `SELECT id, user_id AS "userId", status, cash_total_paise AS "cashTotalPaise",
            sparks_total AS "sparksTotal", earnback_sparks as "earnbackSparks",
            payment_provider AS "paymentProvider", payment_intent_id AS "paymentIntentId",
            shipping_address AS "shippingAddress",
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM orders WHERE id = $1`,
    [orderId]
  );
  if (!res.rows[0]) throw ApiError.notFound('Order not found');
  const order = res.rows[0];
  order.items = await getOrderItems(undefined, orderId);
  return order;
}

async function getOrderItems(client: DBClient | undefined, orderId: string): Promise<OrderItemView[]> {
  const sql = `SELECT id, product_id AS "productId", product_name AS "productName",
                      product_sku AS "productSku", image_url AS "imageUrl", qty,
                      unit_price_paise AS "unitPricePaise", sparks_applied AS "sparksApplied",
                      line_cash_paise AS "lineCashPaise", line_sparks AS "lineSparks"
                 FROM order_items WHERE order_id = $1 ORDER BY id`;
  const res = client ? await client.query(sql, [orderId]) : await query(sql, [orderId]);
  return res.rows;
}
