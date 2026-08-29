import { Hono } from 'hono';
import { z } from 'zod';
import { catalogService } from '../services/catalogService';
import { parseQuery } from '../middleware/validate';
import type { AppEnv } from '../env';

const listQuerySchema = z.object({
  category: z.string().max(100).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export const catalogRouter = new Hono<AppEnv>();

catalogRouter.get('/categories', async (c) => {
  return c.json({ categories: await catalogService.listCategories() });
});

catalogRouter.get('/products', async (c) => {
  const q = parseQuery(c, listQuerySchema);
  const result = await catalogService.listProducts({
    categorySlug: q.category,
    search: q.search,
    limit: q.limit,
    offset: q.offset,
  });
  return c.json(result);
});

catalogRouter.get('/products/:id', async (c) => {
  return c.json({ product: await catalogService.getProduct(c.req.param('id')) });
});
