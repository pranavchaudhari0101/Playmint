import type { Context } from 'hono';
import { ZodError, ZodType } from 'zod';
import { ApiError } from '../errors';

/** Parses + validates the JSON body against a zod schema. */
export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw ApiError.badRequest('Request body must be valid JSON');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw ApiError.badRequest('Invalid request body', formatZodError(result.error));
  }
  return result.data;
}

/** Parses + validates the query string against a zod schema. */
export function parseQuery<T>(c: Context, schema: ZodType<T>): T {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw ApiError.badRequest('Invalid query parameters', formatZodError(result.error));
  }
  return result.data;
}

function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
