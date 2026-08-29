/**
 * E2E test helper: creates a Clerk test user via the Backend REST API,
 * opens the one-time sign-in ticket URL in a real browser (Playwright),
 * then extracts a session JWT via window.Clerk and saves it to
 * ../../worker/test-token.txt.
 * Run from react/:
 *   CLERK_SECRET_KEY=... node e2e/mint-token.mjs
 * (requires the vite dev server running on :5173)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const SECRET = process.env.CLERK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const API = 'https://api.clerk.com/v1';

async function clerkFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk API ${path} failed ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

const email = `workertest${Date.now() % 100000}@gmail.com`;
const password = 'TestPassword123456!';

const user = await clerkFetch('/users', {
  method: 'POST',
  body: {
    email_address: [email],
    password,
    first_name: 'Worker',
    last_name: 'Test',
    skip_password_checks: true,
  },
});
console.log('created user:', user.id, email);

const signInToken = await clerkFetch('/sign_in_tokens', {
  method: 'POST',
  body: { user_id: user.id, expires_in_seconds: 600 },
});
// After consuming the ticket, redirect into our app — Clerk performs the
// cross-domain session handshake so our ClerkProvider picks the session up.
const ticketUrl = `${signInToken.url}${signInToken.url.includes('?') ? '&' : '?'}redirect_url=${encodeURIComponent(FRONTEND_URL + '/login')}`;
console.log('ticket url ready');

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
console.log('landed on:', page.url());

// Wait until we're back on the app with an active session.
await page.waitForFunction(
  () =>
    window.location.origin === 'http://localhost:5173' &&
    window.Clerk?.loaded === true &&
    window.Clerk?.session != null,
  null,
  { timeout: 60_000 },
);
console.log('app session active:', await page.evaluate(() => window.Clerk.session.id));

const jwt = await page.evaluate(() => window.Clerk.session.getToken());
if (!jwt) {
  console.log('no token from Clerk session');
  process.exit(1);
}
fs.writeFileSync('../../worker/test-token.txt', jwt);
console.log('JWT saved to worker/test-token.txt');

await browser.close();
