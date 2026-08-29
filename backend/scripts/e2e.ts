/**
 * End-to-end verification of the Playmint API.
 * Run: npx tsx scripts/e2e.ts   (server must be running on :4000)
 */
const BASE = 'http://localhost:4000/api';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('── 1. Auth ──────────────────────────────────────');
  const email = `e2e_${Date.now()}@test.dev`;
  const signup = await api('POST', '/auth/signup', {
    email,
    password: 'Password@123',
    displayName: 'E2E Tester',
  });
  check('signup returns 201 + token + welcome bonus', signup.status === 201 && signup.json.token && signup.json.walletBalance === 2500, signup.json);

  const dupe = await api('POST', '/auth/signup', { email, password: 'Password@123' });
  check('duplicate signup rejected 409', dupe.status === 409);

  const badLogin = await api('POST', '/auth/login', { email, password: 'wrong-pass-1' });
  check('wrong password rejected 401', badLogin.status === 401);

  const login = await api('POST', '/auth/login', { email, password: 'Password@123' });
  check('login ok', login.status === 200 && login.json.token);
  const token = login.json.token;
  const userId = login.json.user.id;

  const me = await api('GET', '/auth/me', undefined, token);
  check('GET /auth/me returns user + wallet', me.status === 200 && me.json.user.email === email);

  console.log('── 2. Wallet & Earn (idempotency) ──────────────');
  const earn1 = await api('POST', '/wallet/earn', { amount: 150, source: 'MATCH_WIN', eventId: 'evt-abc-123' }, token);
  check('earn credits +150', earn1.status === 201 && earn1.json.newBalance === 2650, earn1.json);

  const earnDupe = await api('POST', '/wallet/earn', { amount: 150, source: 'MATCH_WIN', eventId: 'evt-abc-123' }, token);
  check('duplicate eventId not double-credited', earnDupe.status === 200 && earnDupe.json.newBalance === 2650 && earnDupe.json.duplicate === true, earnDupe.json);

  const earnOver = await api('POST', '/wallet/earn', { amount: 999999, source: 'MATCH_WIN', eventId: 'evt-big-999' }, token);
  check('earn over cap rejected', earnOver.status === 400);

  const earnBadSource = await api('POST', '/wallet/earn', { amount: 100, source: 'HACK_SERVER', eventId: 'evt-x-001' }, token);
  check('invalid source rejected', earnBadSource.status === 400);

  const noAuth = await api('GET', '/wallet');
  check('wallet without token rejected 401', noAuth.status === 401);

  console.log('── 3. Catalog ──────────────────────────────────');
  const cats = await api('GET', '/catalog/categories');
  check('categories listed', cats.status === 200 && cats.json.categories.length === 6, cats.json.categories?.length);

  const prods = await api('GET', '/catalog/products?limit=50');
  check('18 products listed', prods.status === 200 && prods.json.total === 18, prods.json.total);
  const products = prods.json.products;
  const buds = products.find((p: any) => p.sku === 'pulse-buds');
  const foodVoucher = products.find((p: any) => p.sku === 'voucher-food');
  check('hybrid product present (buds ₹999/max 7000)', buds && buds.cashPricePaise === 99900 && buds.maxSparks === 7000);
  check('sparks-only product present (food voucher 29900)', foodVoucher && foodVoucher.cashPricePaise === 0 && foodVoucher.maxSparks === 29900);

  const filtered = await api('GET', '/catalog/products?category=gaming');
  check('category filter works', filtered.json.products.every((p: any) => p.categorySlug === 'gaming') && filtered.json.total === 4, filtered.json.total);

  console.log('── 4. Quote (server-authoritative pricing) ─────');
  const overCapQuote = await api('POST', '/checkout/quote', {
    items: [{ productId: buds.id, qty: 1, sparksApplied: 999999 }],
  }, token);
  check('over-cap spark allocation rejected', overCapQuote.status === 422);

  const quote = await api('POST', '/checkout/quote', {
    items: [{ productId: buds.id, qty: 2, sparksApplied: 14000 }],
  }, token);
  // 2 × ₹999 = ₹1998; sparks capped at 14000 (= ₹140) → cash ₹1858
  check('quote: 2 buds with max sparks → cash ₹1858', quote.status === 200 && quote.json.cashTotalPaise === 185800, quote.json);

  const quote2 = await api('POST', '/checkout/quote', {
    items: [{ productId: buds.id, qty: 1, sparksApplied: 3000 }],
  }, token);
  check('quote: partial coverage → cash ₹969', quote2.status === 200 && quote2.json.cashTotalPaise === 96900, quote2.json?.cashTotalPaise);

  console.log('── 5. Sparks-only checkout (instant settle) ────');
  // balance is 2650 — insufficient for the 29900 voucher
  const tooPoor = await api('POST', '/checkout/orders', {
    items: [{ productId: foodVoucher.id, qty: 1, sparksApplied: 29900 }],
  }, token);
  check('insufficient sparks rejected 422', tooPoor.status === 422 && tooPoor.json.error?.code === 'INSUFFICIENT_SPARKS', tooPoor.json);

  // earn enough then buy socks (34900) — still too much; buy avatar pack (2500)
  const avatar = products.find((p: any) => p.sku === 'avatar-sticker-pack');
  const soOrder = await api('POST', '/checkout/orders', {
    items: [{ productId: avatar.id, qty: 1, sparksApplied: 2500 }],
  }, token);
  check('sparks-only order settles instantly to PAID', soOrder.status === 201 && soOrder.json.order.status === 'PAID', soOrder.json.order?.status);
  check('wallet debited to 150', soOrder.json.wallet.balance === 150, soOrder.json.wallet?.balance);

  console.log('── 6. Hybrid order + mock payment SUCCESS ──────');
  // earn more sparks
  await api('POST', '/wallet/earn', { amount: 2500, source: 'LEVEL_UP', eventId: 'evt-level-2' }, token);
  await api('POST', '/wallet/earn', { amount: 2500, source: 'QUEST_COMPLETE', eventId: 'evt-quest-2' }, token);
  // wallet now 150 + 5000 = 5150

  const hybrid = await api('POST', '/checkout/orders', {
    items: [{ productId: buds.id, qty: 1, sparksApplied: 5000 }],
    shippingAddress: {
      fullName: 'E2E Tester', phone: '9876543210', line1: '1 Test St',
      city: 'Mumbai', state: 'MH', pincode: '400001',
    },
  }, token);
  check('hybrid order created PENDING_PAYMENT with intent', hybrid.status === 201 && hybrid.json.order.status === 'PENDING_PAYMENT' && hybrid.json.intent?.intentId?.startsWith('mockpay_'), hybrid.json);
  check('sparks reserved (5150-5000=150)', hybrid.json.wallet.balance === 150, hybrid.json.wallet);

  const intentId = hybrid.json.intent.intentId;
  const paySuccess = await api('POST', `/payments/mock/${intentId}`, { outcome: 'SUCCESS' }, token);
  check('payment success → PAID', paySuccess.status === 200 && paySuccess.json.order.status === 'PAID', paySuccess.json);
  check('earn-back credited (+100 → 250)', paySuccess.json.wallet.balance === 250, paySuccess.json.wallet);

  const doubleSettle = await api('POST', `/payments/mock/${intentId}`, { outcome: 'SUCCESS' }, token);
  check('double-settle rejected 409', doubleSettle.status === 409);

  console.log('── 7. Hybrid order + mock payment FAILURE ──────');
  // wallet: 250. quote grip: ₹499, apply 200 sparks
  const grip = products.find((p: any) => p.sku === 'controller-grip');
  const failOrder = await api('POST', '/checkout/orders', {
    items: [{ productId: grip.id, qty: 1, sparksApplied: 200 }],
    shippingAddress: {
      fullName: 'E2E Tester', phone: '9876543210', line1: '1 Test St',
      city: 'Mumbai', state: 'MH', pincode: '400001',
    },
  }, token);
  check('order 2 created, 200 sparks reserved (250→50)', failOrder.json.wallet.balance === 50, failOrder.json.wallet);

  const payFail = await api('POST', `/payments/mock/${failOrder.json.intent.intentId}`, { outcome: 'FAILURE' }, token);
  check('payment failure → FAILED + sparks restored to 250', payFail.status === 200 && payFail.json.order.status === 'FAILED' && payFail.json.wallet.balance === 250, payFail.json);

  console.log('── 8. Ledger audit & consistency ───────────────');
  const ledger = await api('GET', '/wallet/ledger?limit=100', undefined, token);
  check('ledger entries returned', ledger.status === 200 && ledger.json.total >= 8, ledger.json.total);
  const sum = ledger.json.entries.reduce((s: number, e: any) => s + e.amount, 0);
  const wallet = await api('GET', '/wallet', undefined, token);
  check(`ledger SUM (${sum}) == wallet balance (${wallet.json.balance})`, sum === wallet.json.balance, { sum, wallet: wallet.json.balance });

  console.log('── 9. Goals ─────────────────────────────────────');
  const goal = await api('POST', '/goals', { productId: buds.id }, token);
  check('goal set (target 7000)', goal.status === 201 && goal.json.goal.targetSparks === 7000, goal.json);
  const activeGoal = await api('GET', '/goals/active', undefined, token);
  check('active goal with progress', activeGoal.json.goal && activeGoal.json.goal.remainingSparks === 6750, activeGoal.json.goal);
  const dropGoal = await api('DELETE', '/goals/active', undefined, token);
  check('goal dropped 204', dropGoal.status === 204);

  console.log('── 10. Order history & cancel ───────────────────');
  const history = await api('GET', '/orders', undefined, token);
  check('order history listed (3 orders)', history.json.total === 3, history.json.total);

  console.log('── 11. Admin ────────────────────────────────────');
  const adminLogin = await api('POST', '/auth/login', { email: 'admin@playsuper.dev', password: 'Admin@12345' });
  const adminToken = adminLogin.json.token;
  check('admin login', adminLogin.status === 200 && adminLogin.json.user.role === 'admin');

  const stats = await api('GET', '/admin/stats', undefined, adminToken);
  check('admin stats', stats.status === 200 && stats.json.totalUsers >= 3, stats.json.totalUsers);

  const playerForbidden = await api('GET', '/admin/stats', undefined, token);
  check('admin API forbidden for player (403)', playerForbidden.status === 403);

  // create product
  const newProduct = await api('POST', '/admin/products', {
    sku: `e2e-${Date.now()}`,
    name: 'E2E Test Product',
    cashPricePaise: 10000,
    maxSparks: 5000,
    earnbackSparks: 50,
    stock: 10,
  }, adminToken);
  check('admin creates product', newProduct.status === 201, newProduct.json);

  // update product
  const updated = await api('PATCH', `/admin/products/${newProduct.json.id}`, { stock: 5 }, adminToken);
  check('admin updates product stock', updated.status === 200);

  // soft delete
  const deleted = await api('DELETE', `/admin/products/${newProduct.json.id}`, undefined, adminToken);
  check('admin soft-deletes product', deleted.status === 200);

  // ledger adjust
  const adjust = await api('POST', '/admin/ledger/adjust', {
    userId, amount: 1000, description: 'E2E goodwill credit',
  }, adminToken);
  check('admin adjusts balance +1000 (250→1250)', adjust.status === 200 && adjust.json.wallet.balance === 1250, adjust.json);

  const overdraw = await api('POST', '/admin/ledger/adjust', {
    userId, amount: -999999, description: 'E2E overdraw attempt',
  }, adminToken);
  check('admin overdraw rejected 422', overdraw.status === 422);

  // orders + users + ledger listing
  const adminOrders = await api('GET', '/admin/orders?status=PAID', undefined, adminToken);
  check('admin lists PAID orders', adminOrders.status === 200 && adminOrders.json.total >= 2, adminOrders.json.total);
  const adminUsers = await api('GET', '/admin/users', undefined, adminToken);
  check('admin lists users', adminUsers.status === 200 && adminUsers.json.total >= 3);
  const adminLedger = await api('GET', `/admin/ledger?userId=${userId}`, undefined, adminToken);
  check('admin ledger filter by user', adminLedger.status === 200 && adminLedger.json.total >= 8);

  console.log('── 12. Concurrency: parallel reserve ────────────');
  // 3 parallel orders each reserving 1000 sparks with balance 1250 → exactly 1 must win
  const parallel = await Promise.all(
    [1, 2, 3].map((i) =>
      api('POST', '/checkout/orders', {
        items: [{ productId: grip.id, qty: 1, sparksApplied: 1000 }],
        shippingAddress: { fullName: 'T', phone: '9876543210', line1: 'x', city: 'Mumbai', state: 'MH', pincode: '400001' },
      }, token).then(r => ({ i, ...r }))
    )
  );
  const wins = parallel.filter(r => r.status === 201).length;
  const conflicts = parallel.filter(r => r.status === 422).length;
  check(`parallel reserves: 1 win, 2 rejected (got ${wins}W/${conflicts}R)`, wins === 1 && conflicts === 2, parallel.map(p => p.status));
  // clean up pending orders via cancel
  for (const r of parallel.filter(r => r.status === 201)) {
    await api('POST', `/orders/${r.json.order.id}/cancel`, undefined, token);
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  RESULT: ${passed} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('E2E crashed:', err);
  process.exit(1);
});
