import fs from 'fs';
import path from 'path';
import { pool } from '../src/db';

/** Simple forward-only migration runner. Tracks applied migrations in schema_migrations. */
async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const applied = new Set(
      (await client.query(`SELECT id FROM schema_migrations`)).rows.map((r) => r.id)
    );

    for (const file of files) {
      const id = file.replace(/\.sql$/, '');
      if (applied.has(id)) {
        console.log(`= ${id} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`+ applying ${id}…`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [id]);
        await client.query('COMMIT');
        console.log(`  ✓ ${id} applied`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
