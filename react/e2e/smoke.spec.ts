import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * ─── Playmint — browser smoke suite ────────────────────────
 * Five end-to-end scenarios against the live stack. Each test creates
 * a fresh player via the API and injects the JWT, so scenarios are
 * independent and assertions are exact.
 * ──────────────────────────────────────────────────────────────────
 */

const API = 'http://localhost:4000/api';

interface SignupResult {
  token: string;
  user: { id: string; email: string };
  walletBalance: number;
}

async function signUp(api: APIRequestContext, label: string): Promise<SignupResult> {
  const res = await api.post(`${API}/auth/signup`, {
    data: {
      email: `pw_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.dev`,
      password: 'Password@123',
      displayName: `PW ${label}`,
    },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as SignupResult;
}

/** Logs the browser in as a pre-authenticated user by planting the JWT. */
async function loginAs(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('sparks.token', t), token);
}

async function walletBalanceApi(api: APIRequestContext, token: string): Promise<number> {
  const res = await api.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).balance;
}

async function findProductBySku(api: APIRequestContext, sku: string) {
  const products = await (await api.get(`${API}/catalog/products?limit=60`)).json();
  const product = products.products.find((p: { sku: string }) => p.sku === sku);
  expect(product).toBeTruthy();
  return product as { id: string; sku: string };
}

// ═══════════════════════════════════════════════════════════════════

test.describe('smoke: play Vector, earn + idempotency', () => {
  test('solving level 1 earns 150 with first-win banner; replaying the same eventId never double-credits', async ({
    page,
    request,
  }) => {
    const user = await signUp(request, 'earn');
    await loginAs(page, user.token);
    await page.goto('/');

    const before = await walletBalanceApi(request, user.token);

    // Enter the puzzle from the home CTA.
    await page.getByRole('button', { name: /Play Vector/i }).click();
    await expect(page.getByRole('heading', { name: 'Vector' })).toBeVisible();
    await expect(page.getByTestId('vector-board')).toBeVisible();

    // Solve level 1 by tapping legal arrows until the board is empty.
    for (let i = 0; i < 8; i++) {
      const legal = page.getByTestId('legal-arrow');
      const count = await legal.count();
      if (count === 0) break;
      await legal.first().click();
      await page.waitForTimeout(420); // exit animation + rerender
    }

    // Win overlay with the Sparks collect button.
    await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
    await expect(page.getByText('Level 1 complete')).toBeVisible();
    await page.getByRole('button', { name: /Collect \+150/i }).click();

    // Earn moment: celebration + first-win store unlock banner.
    await expect(page.getByText(/Match Complete · Victory/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Rewards Store unlocked')).toBeVisible();

    const afterEarn = await walletBalanceApi(request, user.token);
    expect(afterEarn).toBe(before + 150);

    // Dev drawer: send an earn, then replay the exact same eventId.
    await page.goto('/dev');
    await page.getByRole('button', { name: /Send earn/i }).click();
    await expect(page.getByText(/EARN \+\d+ via /i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Replay same eventId/i }).click();
    await expect(page.getByText(/DUPLICATE eventId/i)).toBeVisible({ timeout: 10_000 });

    // Idempotency held: the replay did not move the balance.
    const afterReplay = await walletBalanceApi(request, user.token);
    const afterSend = await walletBalanceApi(request, user.token);
    expect(afterSend).toBe(afterEarn + 150); // the first dev send credited
    expect(afterReplay).toBe(afterSend); // the replay changed nothing
  });

  test('level 2 stays locked until level 1 is cleared; replays earn nothing', async ({
    page,
    request,
  }) => {
    const user = await signUp(request, 'vectorlock');
    await loginAs(page, user.token);
    await page.goto('/play');

    // Level 2 dot is locked for a fresh player.
    const dot2 = page.locator('.lvl-dot', { hasText: '2' });
    await expect(dot2).toHaveClass(/locked/);
    await expect(dot2).toBeDisabled();

    // Solve level 1 (fresh progress on this browser profile).
    for (let i = 0; i < 8; i++) {
      const legal = page.getByTestId('legal-arrow');
      if ((await legal.count()) === 0) break;
      await legal.first().click();
      await page.waitForTimeout(420);
    }
    await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
    await page.getByRole('button', { name: /Collect \+150/i }).click();
    await expect(page.getByText(/Match Complete · Victory/i)).toBeVisible({ timeout: 15_000 });

    // Back to the game (resumes at level 2) — level 2 is now unlocked.
    await page.goto('/play');
    await expect(dot2).not.toHaveClass(/locked/);

    // Replay level 1: select its dot, solve again — "already earned", no credit.
    await page.locator('.lvl-dot', { hasText: /^1$/ }).click();
    for (let i = 0; i < 8; i++) {
      const legal = page.getByTestId('legal-arrow');
      if ((await legal.count()) === 0) break;
      await legal.first().click();
      await page.waitForTimeout(420);
    }
    await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
    await expect(page.getByText(/already earned/i)).toBeVisible();

    const wallet = await (
      await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${user.token}` } })
    ).json();
    expect(wallet.balance).toBe(2500 + 150); // welcome + one level credit only
  });
});

test.describe('smoke: sparks-only checkout settles instantly', () => {
  test('avatar pack is bought with Sparks alone and is instantly PAID', async ({
    page,
    request,
  }) => {
    const user = await signUp(request, 'sparksonly'); // 2,500 welcome sparks
    await loginAs(page, user.token);

    const avatar = await findProductBySku(request, 'avatar-sticker-pack'); // exactly 2,500
    await page.goto(`/product/${avatar.id}`);
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.getByRole('button', { name: /Go to cart/i }).click();
    await page.getByRole('button', { name: /CONTINUE TO CHECKOUT/i }).click();

    // Sparks-only digital order — no address needed.
    await page.getByRole('button', { name: /PLACE ORDER/i }).click();

    await expect(page.getByText('Reward Unlocked')).toBeVisible({ timeout: 15_000 });
    // Loop closes back into the game.
    await expect(page.getByRole('link', { name: /Play next match/i })).toBeVisible();

    const wallet = await (
      await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${user.token}` } })
    ).json();
    expect(wallet.balance).toBe(0); // 2500 − 2500
    expect(wallet.lifetimeSpent).toBe(2500);
  });
});

test.describe('smoke: hybrid order + successful payment', () => {
  test('buds with max Sparks, pay cash, earn-back credited', async ({ page, request }) => {
    const user = await signUp(request, 'hybridok'); // 2,500 sparks
    await loginAs(page, user.token);

    const buds = await findProductBySku(request, 'pulse-buds'); // ₹999, cap 7000
    await page.goto(`/product/${buds.id}`);
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.getByRole('button', { name: /Go to cart/i }).click();

    // Cart defaults to the full 7000 cap; clamp to what the wallet holds (2500)
    // via the slider's Max quick-set (slidableMax = min(cap, balance)).
    await page.getByRole('button', { name: /^Max Sparks$/i }).click();

    await page.getByRole('button', { name: /CONTINUE TO CHECKOUT/i }).click();

    // Prefilled demo address ships with the form. Cash = ₹999 − ₹25 = ₹974.
    await page.getByRole('button', { name: /PLACE ORDER · ₹974/i }).click();

    // Mock gateway: simulate success.
    await page.getByRole('button', { name: /SIMULATE SUCCESSFUL PAYMENT/i }).click();

    await expect(page.getByText('Order Confirmed')).toBeVisible({ timeout: 15_000 });

    const wallet = await (
      await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${user.token}` } })
    ).json();
    // 2500 welcome − 2500 sparks + 100 earn-back = 100
    expect(wallet.balance).toBe(100);
    expect(wallet.lifetimeSpent).toBe(2500);

    // Success page frames the earn-back as fuel for the next reward.
    await expect(page.getByText(/\+100 Sparks earned back/i)).toBeVisible();
    // And the primary CTA returns to the game — the loop closes.
    await expect(page.getByRole('link', { name: /Play next match/i })).toBeVisible();
  });
});

test.describe('smoke: hybrid order + failed payment restores Sparks', () => {
  test('failed gateway returns reserved Sparks to the wallet', async ({ page, request }) => {
    const user = await signUp(request, 'hybridfail'); // 2,500 sparks
    await loginAs(page, user.token);

    const grip = await findProductBySku(request, 'controller-grip'); // ₹499, cap 4000
    await page.goto(`/product/${grip.id}`);
    await page.getByRole('button', { name: /Add to cart/i }).click();
    await page.getByRole('button', { name: /Go to cart/i }).click();
    await page.getByRole('button', { name: /^Max Sparks$/i }).click(); // 2500 of cap 4000
    await page.getByRole('button', { name: /CONTINUE TO CHECKOUT/i }).click();

    // Cash = ₹499 − ₹25 = ₹474.
    await page.getByRole('button', { name: /PLACE ORDER · ₹474/i }).click();

    // The gateway modal opening proves the order was created — which
    // means the Sparks reservation has already been committed.
    await expect(
      page.getByRole('heading', { name: /payment gateway/i }),
    ).toBeVisible({ timeout: 10_000 });

    const duringPending = await walletBalanceApi(request, user.token);
    expect(duringPending).toBe(0); // all 2,500 held

    // Fail the payment.
    await page.getByRole('button', { name: /SIMULATE FAILED PAYMENT/i }).click();

    await expect(page.getByText('PAYMENT FAILED')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/2,500 SPARKS RETURNED/i)).toBeVisible();

    const restored = await walletBalanceApi(request, user.token);
    expect(restored).toBe(2500);
  });
});

test.describe('smoke: admin console', () => {
  test('stats render, product CRUD works, balance adjust rejects overdraw', async ({
    page,
    request,
  }) => {
    // Admin session via seeded credentials.
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@playsuper.dev', password: 'Admin@12345' },
    });
    const { token } = await res.json();
    await loginAs(page, token);
    await page.goto('/admin');

    // Dashboard stats are live SQL aggregates.
    await expect(page.getByText('TOTAL USERS')).toBeVisible();
    await expect(page.getByText('BURN RATE')).toBeVisible();

    // Products: create (unique name per run — rows accumulate across runs).
    const stamp = `${Date.now()}`.slice(-7);
    const productName = `PW Widget ${stamp}`;
    await page.getByRole('link', { name: 'PRODUCTS' }).click();
    await page.getByRole('button', { name: /New product/i }).click();
    const sku = `pw_${Date.now()}`;
    await page.getByLabel('Name').fill(productName);
    await page.getByLabel('SKU').fill(sku);
    await page.getByLabel('Cash price (₹)').fill('123.50');
    await page.getByLabel('Max Sparks').fill('5000');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText(`Product "${productName}" created`)).toBeVisible({
      timeout: 10_000,
    });

    // Deactivate it from the table (soft delete keeps history intact).
    const row = page.locator('tr', { hasText: productName });
    await row.locator('button').filter({ hasText: /ACTIVE/ }).first().click();
    await expect(page.getByText('Product deactivated')).toBeVisible({ timeout: 10_000 });

    // Users: adjust balance, then attempt an overdraw.
    const victim = await signUp(request, 'adjusttarget');
    await page.getByRole('link', { name: 'USERS' }).click();
    await page.getByPlaceholder('Search email or name').fill(victim.user.email);
    await page.getByRole('button', { name: 'Search' }).click();
    const userRow = page.locator('tr', { hasText: victim.user.email });
    await userRow.getByRole('button', { name: /Adjust/i }).click();

    await page.getByLabel(/Amount \(Sparks/i).fill('-999999');
    await page.getByLabel(/Description/i).fill('playwright overdraw attempt');
    await page.getByRole('button', { name: 'Apply adjustment' }).click();
    await expect(page.getByText(/overdraw/i).first()).toBeVisible({ timeout: 10_000 });

    // A valid positive adjustment goes through and lands in the ledger.
    await page.getByLabel(/Amount \(Sparks/i).fill('300');
    await page.getByLabel(/Description/i).fill('playwright goodwill credit');
    await page.getByRole('button', { name: 'Apply adjustment' }).click();
    await expect(page.getByText(/applied to/i).first()).toBeVisible({ timeout: 10_000 });

    const wallet = await (
      await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${victim.token}` } })
    ).json();
    expect(wallet.balance).toBe(2800); // 2500 + 300
  });
});
