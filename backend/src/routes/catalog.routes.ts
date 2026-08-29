import { Router, Response } from 'express';
import { z } from 'zod';
import { catalogService } from '../services/catalogService';
import { validateQuery } from '../middleware/validate';

const listQuerySchema = z.object({
  category: z.string().max(100).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_req, res: Response) => {
  res.json({ categories: await catalogService.listCategories() });
});

catalogRouter.get('/products', validateQuery(listQuerySchema), async (req, res: Response) => {
  const q = req.query as unknown as {
    category?: string;
    search?: string;
    limit: number;
    offset: number;
  };
  const result = await catalogService.listProducts({
    categorySlug: q.category,
    search: q.search,
    limit: q.limit,
    offset: q.offset,
  });
  res.json(result);
});

catalogRouter.get('/products/:id', async (req, res: Response) => {
  res.json({ product: await catalogService.getProduct(req.params.id) });
});
