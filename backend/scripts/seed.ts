import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { pool, withTransaction } from '../src/db';
import { ledgerService } from '../src/services/ledgerService';

/**
 * Seeds: admin + demo player accounts, 6 categories, 18 products.
 * Safe to re-run: skips when the catalogue already exists.
 */

const CATEGORIES = [
  { name: 'Gaming', slug: 'gaming', sortOrder: 1 },
  { name: 'Food', slug: 'food', sortOrder: 2 },
  { name: 'Fashion', slug: 'fashion', sortOrder: 3 },
  { name: 'Digital', slug: 'digital', sortOrder: 4 },
  { name: 'Lifestyle', slug: 'lifestyle', sortOrder: 5 },
  { name: 'Electronics', slug: 'electronics', sortOrder: 6 },
];

interface SeedProduct {
  sku: string;
  name: string;
  categorySlug: string;
  /** rupees; 0 = Sparks-only product */
  priceRupees: number;
  maxSparks: number;
  earnbackSparks: number;
  sparksOnly?: boolean;
  tags: string[];
  stock: number | null;
}

const PRODUCTS: SeedProduct[] = [
  { sku: 'pulse-buds', name: 'Pulse Mini Earbuds', categorySlug: 'gaming', priceRupees: 999, maxSparks: 7000, earnbackSparks: 100, tags: ['Best Seller', 'Gaming'], stock: 40 },
  { sku: 'bt-speaker', name: 'Pocket Bluetooth Speaker', categorySlug: 'gaming', priceRupees: 1199, maxSparks: 7000, earnbackSparks: 120, tags: ['Portable', 'Gaming'], stock: 25 },
  { sku: 'controller-grip', name: 'Game Night Controller Grip', categorySlug: 'gaming', priceRupees: 499, maxSparks: 4000, earnbackSparks: 50, tags: ['Ergonomic'], stock: 60 },
  { sku: 'rgb-desk-light', name: 'RGB Desk Light', categorySlug: 'gaming', priceRupees: 699, maxSparks: 5000, earnbackSparks: 70, tags: ['Ambiance'], stock: 35 },
  { sku: 'voucher-food', name: 'Food Treat Voucher', categorySlug: 'food', priceRupees: 0, maxSparks: 29900, earnbackSparks: 0, sparksOnly: true, tags: ['Instant Delivery'], stock: null },
  { sku: 'voucher-energy', name: 'Energy Drink Voucher', categorySlug: 'food', priceRupees: 0, maxSparks: 2900, earnbackSparks: 0, sparksOnly: true, tags: ['Instant Delivery'], stock: null },
  { sku: 'voucher-coffee', name: 'Coffee Break Voucher', categorySlug: 'food', priceRupees: 0, maxSparks: 19900, earnbackSparks: 0, sparksOnly: true, tags: ['Instant Delivery'], stock: null },
  { sku: 'voucher-movie', name: 'Movie Night Voucher', categorySlug: 'digital', priceRupees: 0, maxSparks: 29900, earnbackSparks: 0, sparksOnly: true, tags: ['Digital'], stock: null },
  { sku: 'mobile-recharge', name: 'Mobile Recharge Pack', categorySlug: 'digital', priceRupees: 0, maxSparks: 19900, earnbackSparks: 0, sparksOnly: true, tags: ['Instant'], stock: null },
  { sku: 'music-pass', name: 'Music Premium Pass', categorySlug: 'digital', priceRupees: 0, maxSparks: 29900, earnbackSparks: 0, sparksOnly: true, tags: ['Digital'], stock: null },
  { sku: 'oversized-hoodie', name: 'Everyday Oversized Hoodie', categorySlug: 'fashion', priceRupees: 799, maxSparks: 5000, earnbackSparks: 80, tags: ['Comfort'], stock: 30 },
  { sku: 'game-socks', name: 'Game Night Socks', categorySlug: 'fashion', priceRupees: 0, maxSparks: 34900, earnbackSparks: 20, sparksOnly: true, tags: ['Fun'], stock: null },
  { sku: 'canvas-sling-bag', name: 'Canvas Sling Bag', categorySlug: 'fashion', priceRupees: 699, maxSparks: 4500, earnbackSparks: 60, tags: ['Casual'], stock: 28 },
  { sku: 'travel-bottle', name: 'Travel Bottle', categorySlug: 'lifestyle', priceRupees: 399, maxSparks: 3000, earnbackSparks: 40, tags: ['Eco'], stock: 50 },
  { sku: 'wireless-charger', name: 'Wireless Charging Pad', categorySlug: 'electronics', priceRupees: 899, maxSparks: 5000, earnbackSparks: 90, tags: ['Tech'], stock: 22 },
  { sku: 'phone-case', name: 'Phone Case', categorySlug: 'electronics', priceRupees: 499, maxSparks: 3500, earnbackSparks: 50, tags: ['Protection'], stock: 45 },
  { sku: 'fitness-band-lite', name: 'Fitness Band Lite', categorySlug: 'electronics', priceRupees: 1499, maxSparks: 6000, earnbackSparks: 150, tags: ['Health'], stock: 15 },
  { sku: 'mini-desk-fan', name: 'Mini Desk Fan', categorySlug: 'lifestyle', priceRupees: 599, maxSparks: 4000, earnbackSparks: 60, tags: ['Desk'], stock: 33 },
  { sku: 'avatar-sticker-pack', name: 'Sticker Pack + Avatar Frame', categorySlug: 'digital', priceRupees: 0, maxSparks: 2500, earnbackSparks: 0, sparksOnly: true, tags: ['Exclusive'], stock: null },
];

function imageUrl(name: string): string {
  const label = name.replace(/[^a-zA-Z0-9]+/g, '+');
  return `https://placehold.co/400x400/1c1917/fbbf24?text=${label}`;
}

async function upsertUser(
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
  email: string,
  password: string,
  role: 'user' | 'admin',
  displayName: string
): Promise<string> {
  const hash = await bcrypt.hash(password, 10);
  const res = await client.query(
    `INSERT INTO users (email, password_hash, role, display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
     RETURNING id`,
    [email, hash, role, displayName]
  );
  return res.rows[0].id;
}

async function main() {
  const existing = await pool.query(`SELECT COUNT(*)::int AS n FROM products`);
  if (existing.rows[0].n > 0) {
    console.log('Catalogue already seeded — skipping. (Drop the DB to reseed.)');
    await pool.end();
    return;
  }

  await withTransaction(async (client) => {
    // ── Accounts ────────────────────────────────────────────────────
    const adminId = await upsertUser(client, 'admin@playmint.dev', 'Admin@12345', 'admin', 'Playmint Admin');
    const demoId = await upsertUser(client, 'player@playsuper.dev', 'Player@12345', 'user', 'Demo Player');

    // ── Categories ──────────────────────────────────────────────────
    const categoryIds = new Map<string, string>();
    for (const cat of CATEGORIES) {
      const res = await client.query(
        `INSERT INTO categories (name, slug, sort_order) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.sortOrder]
      );
      categoryIds.set(cat.slug, res.rows[0].id);
    }

    // ── Products ────────────────────────────────────────────────────
    let sortOrder = 0;
    for (const p of PRODUCTS) {
      await client.query(
        `INSERT INTO products
           (category_id, sku, name, description, cash_price_paise, max_sparks,
            earnback_sparks, image_url, tags, stock, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)`,
        [
          categoryIds.get(p.categorySlug) ?? null,
          p.sku,
          p.name,
          p.sparksOnly
            ? `Redeemable with ${p.maxSparks.toLocaleString()} Sparks. Delivered instantly to your account.`
            : `Pay with Sparks, cash, or any mix. You can cover up to ${p.maxSparks.toLocaleString()} Sparks (₹${Math.floor(p.maxSparks / 100)}).`,
          p.priceRupees * 100,
          p.maxSparks,
          p.earnbackSparks,
          imageUrl(p.name),
          p.tags,
          p.stock,
          sortOrder++,
        ]
      );
    }

    // ── Demo player history: welcome bonus + gameplay earns ─────────
    await ledgerService.earn(client, demoId, config.economy.welcomeBonusSparks, 'Welcome bonus', `seed:welcome:${demoId}`);
    await ledgerService.earn(client, demoId, 150, 'Match won (+150 Sparks)', `seed:earn:1:${demoId}`);
    await ledgerService.earn(client, demoId, 40, 'Rewarded action (+40 Sparks)', `seed:earn:2:${demoId}`);
    await ledgerService.earn(client, demoId, 250, 'Level up (+250 Sparks)', `seed:earn:3:${demoId}`);
    await ledgerService.earn(client, adminId, config.economy.welcomeBonusSparks, 'Welcome bonus', `seed:welcome:${adminId}`);

    console.log('Seed complete:');
    console.log('  admin  → admin@playsuper.dev / Admin@12345');
    console.log('  player → player@playsuper.dev / Player@12345');
  });

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
