import { createMiddleware } from 'hono/factory';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { config } from '../config';
import { ApiError } from '../errors';
import { authService } from '../services/authService';
import type { AppEnv } from '../env';

let clerkClient: ReturnType<typeof createClerkClient> | null = null;
function getClerkClient() {
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: config.clerk.secretKey });
  }
  return clerkClient;
}

/**
 * Verifies the Clerk session JWT sent as a Bearer token, then resolves the
 * matching local users row — provisioning it on the first request from a
 * new Clerk user. `c.get('userId')` is always the LOCAL user id, so
 * downstream services keep working unchanged.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw ApiError.unauthorized();

  let clerkUserId: string;
  try {
    const claims = await verifyToken(token, {
      secretKey: config.clerk.secretKey,
      authorizedParties: config.clerk.authorizedParties,
    });
    const sub = (claims as { sub?: unknown }).sub;
    if (typeof sub !== 'string' || !sub) {
      throw ApiError.unauthorized('Invalid token subject');
    }
    clerkUserId = sub;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid or expired token');
  }

  let user = await authService.findByClerkId(clerkUserId);

  if (!user) {
    // First request from this Clerk user — fetch the profile once,
    // then link an existing row by email or provision a new one.
    const clerkUser = await getClerkClient().users.getUser(clerkUserId);
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

  c.set('userId', user.id);
  c.set('userRole', user.role);
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('userRole') !== 'admin') throw ApiError.forbidden('Admin access required');
  await next();
});
