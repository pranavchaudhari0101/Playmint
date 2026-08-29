import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { adminService } from '../services/adminService';

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

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// ── Dashboard ───────────────────────────────────────────────────────
adminRouter.get('/stats', async (_req, res: Response) => {
  res.json(await adminService.getStats());
});

// ── Products ────────────────────────────────────────────────────────
adminRouter.get('/products', validateQuery(productsQuerySchema), async (req, res: Response) => {
  const q = req.query as unknown as { includeInactive: boolean; limit: number; offset: number };
  res.json(await adminService.listProducts(q));
});

adminRouter.post('/products', validateBody(productCreateSchema), async (req, res: Response) => {
  res.status(201).json(await adminService.createProduct(req.body));
});

adminRouter.patch('/products/:id', validateBody(productUpdateSchema), async (req, res: Response) => {
  res.json(await adminService.updateProduct(req.params.id as string, req.body));
});

adminRouter.delete('/products/:id', async (req, res: Response) => {
  res.json(await adminService.deleteProduct(req.params.id));
});

// ── Categories ──────────────────────────────────────────────────────
adminRouter.get('/categories', async (_req, res: Response) => {
  res.json({ categories: await adminService.listCategories() });
});

adminRouter.post('/categories', validateBody(categoryCreateSchema), async (req, res: Response) => {
  res.status(201).json(await adminService.createCategory(req.body));
});

adminRouter.patch('/categories/:id', validateBody(categoryUpdateSchema), async (req, res: Response) => {
  res.json(await adminService.updateCategory(req.params.id as string, req.body));
});

// ── Orders ──────────────────────────────────────────────────────────
adminRouter.get('/orders', validateQuery(ordersQuerySchema), async (req, res: Response) => {
  const q = req.query as unknown as { status?: string; limit: number; offset: number };
  res.json(await adminService.listOrders(q));
});

adminRouter.patch('/orders/:id/status', validateBody(orderStatusSchema), async (req, res: Response) => {
  res.json(await adminService.updateOrderStatus(req.params.id as string, req.body.status));
});

// ── Ledger ──────────────────────────────────────────────────────────
adminRouter.get('/ledger', validateQuery(ledgerQuerySchema), async (req, res: Response) => {
  const q = req.query as unknown as { userId?: string; limit: number; offset: number };
  res.json(await adminService.listLedger(q));
});

adminRouter.post('/ledger/adjust', validateBody(adjustSchema), async (req, res: Response) => {
  res.json(await adminService.adjustBalance(req.body.userId, req.body.amount, req.body.description));
});

// ── Users ───────────────────────────────────────────────────────────
adminRouter.get('/users', validateQuery(usersQuerySchema), async (req, res: Response) => {
  const q = req.query as unknown as { search?: string; limit: number; offset: number };
  res.json(await adminService.listUsers(q));
});

