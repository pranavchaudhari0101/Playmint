import { createApp } from './app';
import { config } from './config';
import { pool } from './db';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`⚡ Playmint API listening on http://localhost:${config.port}`);
  console.log(`   env: ${config.env} | payment provider: ${config.payments.provider}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down…`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
