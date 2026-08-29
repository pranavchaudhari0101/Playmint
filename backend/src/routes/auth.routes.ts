import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { authService } from '../services/authService';
import { ledgerService } from '../services/ledgerService';
import { ApiError } from '../errors';
import { validateBody } from '../middleware/validate';
import { AuthRequest } from '../middleware/auth';
import { authenticate } from '../middleware/auth';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Production keeps a tight budget; development allows the e2e suite's
  // signup/login churn (each Playwright run performs ~10 authentications).
  limit: config.isProd ? 30 : 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
});

const signupSchema = z.object({
  email: z.string().min(3).max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().min(3).max(255),
  password: z.string().min(1).max(128),
});

export const authRouter = Router();

authRouter.post('/signup', authLimiter, validateBody(signupSchema), async (req, res: Response) => {
  const { email, password, displayName } = req.body;
  const result = await authService.signup(email, password, displayName);
  res.status(201).json(result);
});

authRouter.post('/login', authLimiter, validateBody(loginSchema), async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
});

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await authService.getById(req.userId!);
  if (!user) throw ApiError.unauthorized();
  const wallet = await ledgerService.getWallet(user.id);
  res.json({ user, wallet });
});
