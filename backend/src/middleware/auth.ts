import { NextFunction, Request, Response } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { config } from '../config';
import { ApiError } from '../errors';
import { authService } from '../services/authService';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'user' | 'admin';
}

const clerk = createClerkClient({ secretKey: config.clerk.secretKey });

/**
 * Verifies the Clerk session JWT sent as a Bearer token, then resolves the
 * matching local users row — provisioning it on the first request from a
 * new Clerk user. `req.userId` is always the LOCAL user id, so downstream
 * services keep working unchanged.
 */
export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(ApiError.unauthorized());

  let clerkUserId: string;
  try {
    const claims = await verifyToken(token, {
      secretKey: config.clerk.secretKey,
      authorizedParties: config.clerk.authorizedParties,
    });
    const sub = (claims as { sub?: unknown }).sub;
    if (typeof sub !== 'string' || !sub) {
      return next(ApiError.unauthorized('Invalid token subject'));
    }
    clerkUserId = sub;
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }

  try {
    let user = await authService.findByClerkId(clerkUserId);

    if (!user) {
      // First request from this Clerk user — fetch the profile once,
      // then link an existing row by email or provision a new one.
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const email =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        `${clerkUserId.toLowerCase()}@users.noreply.dev`;
      user = await authService.resolveFromClerk(
        clerkUserId,
        email,
        clerkUser.fullName ?? clerkUser.username ?? null,
      );
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') return next(ApiError.forbidden('Admin access required'));
  next();
}
