import { query } from '../db';
import { ApiError } from '../errors';

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  productCount: number;
}

export interface Product {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  sku: string;
  name: string;
  description: string | null;
  cashPricePaise: number;
  maxSparks: number;
  earnbackSparks: number;
  imageUrl: string | null;
  tags: string[];
  stock: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CatalogProduct extends Product {
  isSparksOnly: boolean;
  cashValuePaiseOfMaxSparks: number;
  inStock: boolean;
}

const PRODUCT_SELECT = `
  SELECT p.id, p.category_id AS "categoryId", c.name AS "categoryName",
         c.slug AS "categorySlug", p.sku, p.name, p.description,
         p.cash_price_paise AS "cashPricePaise", p.max_sparks AS "maxSparks",
         p.earnback_sparks AS "earnbackSparks", p.image_url AS "imageUrl",
         p.tags, p.stock, p.is_active AS "isActive", p.sort_order AS "sortOrder",
         p.created_at AS "createdAt"
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
`;

function decorate(p: Product): CatalogProduct {
  return {
    ...p,
    isSparksOnly: p.cashPricePaise === 0,
    cashValuePaiseOfMaxSparks: p.maxSparks,
    inStock: p.stock === null || p.stock > 0,
  };
}

export const catalogService = {
  async listCategories(): Promise<Category[]> {
    const res = await query(
      `SELECT c.id, c.name, c.slug, c.sort_order AS "sortOrder",
              (SELECT COUNT(*)::int FROM products p
                WHERE p.category_id = c.id AND p.is_active = true) AS "productCount"
         FROM categories c
        WHERE c.is_active = true
        ORDER BY c.sort_order, c.name`
    );
    return res.rows;
  },

  async listProducts(opts: {
    categorySlug?: string;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ products: CatalogProduct[]; total: number }> {
    const params: unknown[] = [];
    const where: string[] = ['p.is_active = true'];

    if (opts.categorySlug) {
      params.push(opts.categorySlug);
      where.push(`c.slug = $${params.length}`);
    }
    if (opts.search) {
      params.push(`%${opts.search.toLowerCase()}%`);
      where.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`
      );
    }

    const whereSql = where.join(' AND ');
    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM products p
        LEFT JOIN categories c ON c.id = p.category_id WHERE ${whereSql}`,
      params
    );
    const res = await query(
      `${PRODUCT_SELECT} WHERE ${whereSql}
       ORDER BY p.sort_order, p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, opts.limit, opts.offset]
    );
    return { products: (res.rows as Product[]).map(decorate), total: countRes.rows[0].total };
  },

  async getProduct(id: string): Promise<CatalogProduct> {
    const res = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
    if (!res.rows[0]) throw ApiError.notFound('Product not found');
    return decorate(res.rows[0] as Product);
  },

  /** Used by checkout — must read authoritative prices regardless of active filters. */
  async getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
    if (ids.length === 0) return new Map();
    const res = await query(`${PRODUCT_SELECT} WHERE p.id = ANY($1::uuid[])`, [ids]);
    const map = new Map<string, Product>();
    for (const row of res.rows as Product[]) map.set(row.id, row);
    return map;
  },
};
