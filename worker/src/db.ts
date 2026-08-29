import { neon, Client } from '@neondatabase/serverless';
import { config } from './config';

/**
 * ─── Database (Neon serverless, Workers-safe) ──────────────────────
 * Cloudflare Workers forbid I/O objects crossing request boundaries,
 * so a module-level Pool (which keeps WebSocket connections alive
 * between requests) throws "Cannot perform I/O on behalf of a
 * different request".
 *
 * Therefore, following Neon's official Workers pattern:
 *   - Plain queries use the stateless `neon()` HTTP client (fetch).
 *   - Transactions open a dedicated `Client` per call, use it, and
 *     close it — all within a single request handler.
 *
 * The exported API still mirrors pg (query/withTransaction), so the
 * ported services remain unchanged.
 * ──────────────────────────────────────────────────────────────────
 */

export interface QueryResult {
  rows: any[];
  rowCount: number | null;
}

/** Minimal pg-Client-compatible interface used by the services. */
export interface DBClient {
  query(text: string, params?: unknown[]): Promise<QueryResult>;
}

let sql: ReturnType<typeof neon> | null = null;

function getSql(): ReturnType<typeof neon> {
  if (!sql) {
    if (!config.db.connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    sql = neon(config.db.connectionString);
  }
  return sql;
}

/** Stateless single query over HTTPS. Safe across concurrent requests. */
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const rows = (await getSql()(text, params as never[])) as any[];
  return { rows, rowCount: Array.isArray(rows) ? rows.length : null };
}

/**
 * Runs `fn` inside a single database transaction on a dedicated
 * connection. Commits on success, rolls back on any thrown error.
 * The client is opened and closed within this call — never shared
 * across requests.
 */
export async function withTransaction<T>(fn: (client: DBClient) => Promise<T>): Promise<T> {
  if (!config.db.connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  const client = new Client({ connectionString: config.db.connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client as unknown as DBClient);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Connection already broken — nothing to roll back.
    }
    throw err;
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore teardown errors — the transaction outcome is already decided.
    }
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
