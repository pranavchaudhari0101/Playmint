import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './config';

const poolOptions: PoolConfig = {
  max: 20,
  idleTimeoutMillis: 30_000,
  // Neon computes auto-resume from suspension; allow for the cold start.
  connectionTimeoutMillis: config.db.connectionString ? 15_000 : 5_000,
};

export const pool = new Pool(
  config.db.connectionString
    ? { ...poolOptions, connectionString: config.db.connectionString }
    : {
        ...poolOptions,
        user: config.db.user,
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        password: config.db.password,
      },
);

/**
 * Runs `fn` inside a single database transaction.
 * Commits on success, rolls back on any thrown error.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params as never[]);
}

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
