# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> smoke: play Vector, earn + idempotency >> solving level 1 earns 150 with first-win banner; replaying the same eventId never double-credits
- Location: e2e\smoke.spec.ts:51:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Rewards Store unlocked')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Rewards Store unlocked')

```

```yaml
- main:
  - text: Match Complete · Victory +150 ✦ 2,650 SPARKS
  - paragraph: Recorded in your ledger — Sparks can't be faked, bought, or cashed out.
  - link "See what I can unlock":
    - /url: /store
  - link "Keep playing":
    - /url: /
  - text: So close
  - paragraph: Two more matches and these are yours. Set one as your goal — we'll track it on the home screen.
  - img
  - text: INSTANT VOUCHER Energy Drink Voucher ⚡ 2,900 · 250 to go~2 matches
  - button "Set as goal"
- region "Notifications alt+T"
```

# Test source

```ts
  1   | import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * ─── PlaySuper Sparks — browser smoke suite ────────────────────────
  5   |  * Five end-to-end scenarios against the live stack. Each test creates
  6   |  * a fresh player via the API and injects the JWT, so scenarios are
  7   |  * independent and assertions are exact.
  8   |  * ──────────────────────────────────────────────────────────────────
  9   |  */
  10  | 
  11  | const API = 'http://localhost:4000/api';
  12  | 
  13  | interface SignupResult {
  14  |   token: string;
  15  |   user: { id: string; email: string };
  16  |   walletBalance: number;
  17  | }
  18  | 
  19  | async function signUp(api: APIRequestContext, label: string): Promise<SignupResult> {
  20  |   const res = await api.post(`${API}/auth/signup`, {
  21  |     data: {
  22  |       email: `pw_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.dev`,
  23  |       password: 'Password@123',
  24  |       displayName: `PW ${label}`,
  25  |     },
  26  |   });
  27  |   expect(res.ok()).toBeTruthy();
  28  |   return (await res.json()) as SignupResult;
  29  | }
  30  | 
  31  | /** Logs the browser in as a pre-authenticated user by planting the JWT. */
  32  | async function loginAs(page: Page, token: string) {
  33  |   await page.addInitScript((t) => localStorage.setItem('sparks.token', t), token);
  34  | }
  35  | 
  36  | async function walletBalanceApi(api: APIRequestContext, token: string): Promise<number> {
  37  |   const res = await api.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${token}` } });
  38  |   return (await res.json()).balance;
  39  | }
  40  | 
  41  | async function findProductBySku(api: APIRequestContext, sku: string) {
  42  |   const products = await (await api.get(`${API}/catalog/products?limit=60`)).json();
  43  |   const product = products.products.find((p: { sku: string }) => p.sku === sku);
  44  |   expect(product).toBeTruthy();
  45  |   return product as { id: string; sku: string };
  46  | }
  47  | 
  48  | // ═══════════════════════════════════════════════════════════════════
  49  | 
  50  | test.describe('smoke: play Vector, earn + idempotency', () => {
  51  |   test('solving level 1 earns 150 with first-win banner; replaying the same eventId never double-credits', async ({
  52  |     page,
  53  |     request,
  54  |   }) => {
  55  |     const user = await signUp(request, 'earn');
  56  |     await loginAs(page, user.token);
  57  |     await page.goto('/');
  58  | 
  59  |     const before = await walletBalanceApi(request, user.token);
  60  | 
  61  |     // Enter the puzzle from the home CTA.
  62  |     await page.getByRole('button', { name: /Play Vector/i }).click();
  63  |     await expect(page.getByRole('heading', { name: 'Vector' })).toBeVisible();
  64  |     await expect(page.getByTestId('vector-board')).toBeVisible();
  65  | 
  66  |     // Solve level 1 by tapping legal arrows until the board is empty.
  67  |     for (let i = 0; i < 8; i++) {
  68  |       const legal = page.getByTestId('legal-arrow');
  69  |       const count = await legal.count();
  70  |       if (count === 0) break;
  71  |       await legal.first().click();
  72  |       await page.waitForTimeout(420); // exit animation + rerender
  73  |     }
  74  | 
  75  |     // Win overlay with the Sparks collect button.
  76  |     await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
  77  |     await expect(page.getByText('Level 1 complete')).toBeVisible();
  78  |     await page.getByRole('button', { name: /Collect \+150/i }).click();
  79  | 
  80  |     // Earn moment: celebration + first-win store unlock banner.
  81  |     await expect(page.getByText(/Match Complete · Victory/i)).toBeVisible({ timeout: 15_000 });
> 82  |     await expect(page.getByText('Rewards Store unlocked')).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  83  | 
  84  |     const afterEarn = await walletBalanceApi(request, user.token);
  85  |     expect(afterEarn).toBe(before + 150);
  86  | 
  87  |     // Dev drawer: send an earn, then replay the exact same eventId.
  88  |     await page.goto('/dev');
  89  |     await page.getByRole('button', { name: /Send earn/i }).click();
  90  |     await expect(page.getByText(/EARN \+\d+ via /i)).toBeVisible({ timeout: 10_000 });
  91  | 
  92  |     await page.getByRole('button', { name: /Replay same eventId/i }).click();
  93  |     await expect(page.getByText(/DUPLICATE eventId/i)).toBeVisible({ timeout: 10_000 });
  94  | 
  95  |     // Idempotency held: the replay did not move the balance.
  96  |     const afterReplay = await walletBalanceApi(request, user.token);
  97  |     const afterSend = await walletBalanceApi(request, user.token);
  98  |     expect(afterSend).toBe(afterEarn + 150); // the first dev send credited
  99  |     expect(afterReplay).toBe(afterSend); // the replay changed nothing
  100 |   });
  101 | 
  102 |   test('level 2 stays locked until level 1 is cleared; replays earn nothing', async ({
  103 |     page,
  104 |     request,
  105 |   }) => {
  106 |     const user = await signUp(request, 'vectorlock');
  107 |     await loginAs(page, user.token);
  108 |     await page.goto('/play');
  109 | 
  110 |     // Level 2 dot is locked for a fresh player.
  111 |     const dot2 = page.locator('.lvl-dot', { hasText: '2' });
  112 |     await expect(dot2).toHaveClass(/locked/);
  113 |     await expect(dot2).toBeDisabled();
  114 | 
  115 |     // Solve level 1 (fresh progress on this browser profile).
  116 |     for (let i = 0; i < 8; i++) {
  117 |       const legal = page.getByTestId('legal-arrow');
  118 |       if ((await legal.count()) === 0) break;
  119 |       await legal.first().click();
  120 |       await page.waitForTimeout(420);
  121 |     }
  122 |     await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
  123 |     await page.getByRole('button', { name: /Collect \+150/i }).click();
  124 |     await expect(page.getByText(/Match Complete · Victory/i)).toBeVisible({ timeout: 15_000 });
  125 | 
  126 |     // Back to the game (resumes at level 2) — level 2 is now unlocked.
  127 |     await page.goto('/play');
  128 |     await expect(dot2).not.toHaveClass(/locked/);
  129 | 
  130 |     // Replay level 1: select its dot, solve again — "already earned", no credit.
  131 |     await page.locator('.lvl-dot', { hasText: /^1$/ }).click();
  132 |     for (let i = 0; i < 8; i++) {
  133 |       const legal = page.getByTestId('legal-arrow');
  134 |       if ((await legal.count()) === 0) break;
  135 |       await legal.first().click();
  136 |       await page.waitForTimeout(420);
  137 |     }
  138 |     await expect(page.getByTestId('win-overlay')).toHaveClass(/show/, { timeout: 10_000 });
  139 |     await expect(page.getByText(/already earned/i)).toBeVisible();
  140 | 
  141 |     const wallet = await (
  142 |       await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${user.token}` } })
  143 |     ).json();
  144 |     expect(wallet.balance).toBe(2500 + 150); // welcome + one level credit only
  145 |   });
  146 | });
  147 | 
  148 | test.describe('smoke: sparks-only checkout settles instantly', () => {
  149 |   test('avatar pack is bought with Sparks alone and is instantly PAID', async ({
  150 |     page,
  151 |     request,
  152 |   }) => {
  153 |     const user = await signUp(request, 'sparksonly'); // 2,500 welcome sparks
  154 |     await loginAs(page, user.token);
  155 | 
  156 |     const avatar = await findProductBySku(request, 'avatar-sticker-pack'); // exactly 2,500
  157 |     await page.goto(`/product/${avatar.id}`);
  158 |     await page.getByRole('button', { name: /Add to cart/i }).click();
  159 |     await page.getByRole('button', { name: /Go to cart/i }).click();
  160 |     await page.getByRole('button', { name: /CONTINUE TO CHECKOUT/i }).click();
  161 | 
  162 |     // Sparks-only digital order — no address needed.
  163 |     await page.getByRole('button', { name: /PLACE ORDER/i }).click();
  164 | 
  165 |     await expect(page.getByText('Reward Unlocked')).toBeVisible({ timeout: 15_000 });
  166 |     // Loop closes back into the game.
  167 |     await expect(page.getByRole('link', { name: /Play next match/i })).toBeVisible();
  168 | 
  169 |     const wallet = await (
  170 |       await request.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${user.token}` } })
  171 |     ).json();
  172 |     expect(wallet.balance).toBe(0); // 2500 − 2500
  173 |     expect(wallet.lifetimeSpent).toBe(2500);
  174 |   });
  175 | });
  176 | 
  177 | test.describe('smoke: hybrid order + successful payment', () => {
  178 |   test('buds with max Sparks, pay cash, earn-back credited', async ({ page, request }) => {
  179 |     const user = await signUp(request, 'hybridok'); // 2,500 sparks
  180 |     await loginAs(page, user.token);
  181 | 
  182 |     const buds = await findProductBySku(request, 'pulse-buds'); // ₹999, cap 7000
```