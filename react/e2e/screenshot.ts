import { chromium } from '@playwright/test';

/**
 * Captures reference screenshots of the redesigned UI into docs/screenshots.
 * Run: npx tsx e2e/screenshot.ts   (stack must be up)
 */
const API = 'http://localhost:4000/api';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const { token } = await res.json();
  await page.addInitScript((t) => localStorage.setItem('sparks.token', t), token);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/01-login.png' });

  await login(page, 'player@playsuper.dev', 'Player@12345');

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/02-game-home.png' });

  await page.goto('http://localhost:5173/store');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/03-store.png' });

  await page.goto('http://localhost:5173/wallet');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/04-wallet.png' });

  await page.goto('http://localhost:5173/dev');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/05-dev-drawer.png' });

  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => localStorage.removeItem('sparks.token'));
  await login(page, 'admin@playsuper.dev', 'Admin@12345');
  await page.goto('http://localhost:5173/admin');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/06-admin-dashboard.png' });

  await page.goto('http://localhost:5173/admin/products');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/07-admin-products.png' });

  await browser.close();
  console.log('Screenshots captured to docs/screenshots/');
}

void main();
