import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { parseBody, parseQuery } from '../middleware/validate';
import { adminService } from '../services/adminService';
import type { AppEnv } from '../env';

const productCreateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  description: z.string().max(2000).nullable().optional(),
  cashPricePaise: z.number().int().min(0).default(0),
  maxSparks: z.number().int().min(0).default(0),
  earnbackSparks: z.number().int().min(0).default(0),
  imageUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(40)).max(10).default([]),
  stock: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const productUpdateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  cashPricePaise: z.number().int().min(0).optional(),
  maxSparks: z.number().int().min(0).optional(),
  earnbackSparks: z.number().int().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  stock: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const categoryCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and dashes'),
  sortOrder: z.number().int().default(0),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const ordersQuerySchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'FULFILLED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const ledgerQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const adjustSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((v) => v !== 0, 'Amount must be non-zero'),
  description: z.string().min(3).max(300),
});

const orderStatusSchema = z.object({
  status: z.enum(['FULFILLED', 'CANCELLED']),
});

const usersQuerySchema = z.object({
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const productsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminRouter = new Hono<AppEnv>();
adminRouter.use('*', authMiddleware, requireAdmin);

// ── Dashboard ───────────────────────────────────────────────────────
adminRouter.get('/stats', async (c) => {
  return c.json(await adminService.getStats());
});

// ── Products ────────────────────────────────────────────────────────
adminRouter.get('/products', async (c) => {
  const q = parseQuery(c, productsQuerySchema);
  return c.json(await adminService.listProducts(q));
});

adminRouter.post('/products', async (c) => {
  const input = await parseBody(c, productCreateSchema);
  return c.json(await adminService.createProduct(input), 201);
});

adminRouter.patch('/products/:id', async (c) => {
  const input = await parseBody(c, productUpdateSchema);
  return c.json(await adminService.updateProduct(c.req.param('id'), input));
});

adminRouter.delete('/products/:id', async (c) => {
  return c.json(await adminService.deleteProduct(c.req.param('id')));
});

// ── Categories ──────────────────────────────────────────────────────
adminRouter.get('/categories', async (c) => {
  return c.json({ categories: await adminService.listCategories() });
});

adminRouter.post('/categories', async (c) => {
  const input = await parseBody(c, categoryCreateSchema);
  return c.json(await adminService.createCategory(input), 201);
});

adminRouter.patch('/categories/:id', async (c) => {
  const input = await parseBody(c, categoryUpdateSchema);
  return c.json(await adminService.updateCategory(c.req.param('id'), input));
});

// ── Orders ──────────────────────────────────────────────────────────
adminRouter.get('/orders', async (c) => {
  const q = parseQuery(c, ordersQuerySchema);
  return c.json(await adminService.listOrders(q));
});

adminRouter.patch('/orders/:id/status', async (c) => {
  const { status } = await parseBody(c, orderStatusSchema);
  return c.json(await adminService.updateOrderStatus(c.req.param('id'), status));
});

// ── Ledger ──────────────────────────────────────────────────────────
adminRouter.get('/ledger', async (c) => {
  const q = parseQuery(c, ledgerQuerySchema);
  return c.json(await adminService.listLedger(q));
});

adminRouter.post('/ledger/adjust', async (c) => {
  const { userId, amount, description } = await parseBody(c, adjustSchema);
  return c.json(await adminService.adjustBalance(userId, amount, description));
});

// ── Users ───────────────────────────────────────────────────────────
adminRouter.get('/users', async (c) => {
  const q = parseQuery(c, usersQuerySchema);
  return c.json(await adminService.listUsers(q));
});
