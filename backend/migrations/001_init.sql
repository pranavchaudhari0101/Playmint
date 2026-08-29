-- ═══════════════════════════════════════════════════════════════════
-- PlaySuper Sparks — Migration 001: Core schema
--
-- Money model (all integers, no floating point):
--   100 Sparks = Rs 1  →  1 Spark = 1 paisa
--   cash prices stored in paise, spark amounts stored in sparks.
--
-- Ledger model:
--   `ledger` is the append-only source of truth (double-entry style).
--   `wallets` is a materialized balance cache updated in the SAME
--   transaction as every ledger insert, guarded by row locks.
--   Balance can always be re-derived: wallets.balance == SUM(ledger.amount).
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Users & auth ───────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
    display_name  VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ── Wallets (materialized balance cache) ──────────────────────────
CREATE TABLE wallets (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance         INTEGER  NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned BIGINT   NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_spent  BIGINT   NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── The Spark Ledger (append-only, never UPDATE/DELETE) ───────────
CREATE TYPE ledger_entry_type AS ENUM
    ('EARN', 'RESERVE', 'COMMIT', 'RELEASE', 'ADJUSTMENT');

CREATE TABLE ledger (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount         INTEGER NOT NULL,            -- +credit / -debit, in Sparks
    entry_type     ledger_entry_type NOT NULL,
    reference_id   UUID,                        -- order id / earn event id
    idempotency_key TEXT,                       -- dedupe key (EARN events)
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_user_created ON ledger(user_id, created_at DESC);
CREATE INDEX idx_ledger_reference    ON ledger(reference_id) WHERE reference_id IS NOT NULL;

-- Idempotency: one credit per earn event key.
CREATE UNIQUE INDEX ledger_earn_key_unique
    ON ledger(idempotency_key) WHERE entry_type = 'EARN';

-- Order lifecycle: at most one RESERVE / COMMIT / RELEASE per order.
CREATE UNIQUE INDEX ledger_one_reserve_per_order
    ON ledger(reference_id) WHERE entry_type = 'RESERVE';
CREATE UNIQUE INDEX ledger_one_commit_per_order
    ON ledger(reference_id) WHERE entry_type = 'COMMIT';
CREATE UNIQUE INDEX ledger_one_release_per_order
    ON ledger(reference_id) WHERE entry_type = 'RELEASE';

-- ── Catalog ────────────────────────────────────────────────────────
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku              VARCHAR(64) UNIQUE NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    -- Cash price in paise. 0 = Sparks-only product.
    cash_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (cash_price_paise >= 0),
    -- Max Sparks applicable. For Sparks-only products this is the exact price.
    max_sparks       INTEGER NOT NULL CHECK (max_sparks >= 0),
    -- Bonus Sparks credited back on successful purchase.
    earnback_sparks  INTEGER NOT NULL DEFAULT 0 CHECK (earnback_sparks >= 0),
    image_url        TEXT,
    tags             TEXT[] NOT NULL DEFAULT '{}',
    -- NULL = unlimited stock
    stock            INTEGER CHECK (stock IS NULL OR stock >= 0),
    is_active        BOOLEAN NOT NULL DEFAULT true,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spark_only_consistent CHECK (
        cash_price_paise > 0 OR max_sparks > 0
    )
);

CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = true;
CREATE INDEX idx_products_active   ON products(is_active, sort_order);

-- ── Orders (multi-item) ────────────────────────────────────────────
CREATE TYPE order_status AS ENUM
    ('PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'FULFILLED');

CREATE TABLE orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status             order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    cash_total_paise   INTEGER NOT NULL DEFAULT 0 CHECK (cash_total_paise >= 0),
    sparks_total       INTEGER NOT NULL DEFAULT 0 CHECK (sparks_total >= 0),
    earnback_sparks    INTEGER NOT NULL DEFAULT 0 CHECK (earnback_sparks >= 0),
    payment_provider   VARCHAR(30),
    payment_intent_id  TEXT,
    shipping_address   JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user   ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE UNIQUE INDEX idx_orders_payment_intent
    ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;

CREATE TABLE order_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id        UUID NOT NULL REFERENCES products(id),
    -- snapshot fields (price at purchase time)
    product_name      VARCHAR(255) NOT NULL,
    product_sku       VARCHAR(64)  NOT NULL,
    image_url         TEXT,
    qty               INTEGER NOT NULL CHECK (qty > 0),
    unit_price_paise  INTEGER NOT NULL CHECK (unit_price_paise >= 0),
    max_sparks        INTEGER NOT NULL,
    sparks_applied    INTEGER NOT NULL CHECK (sparks_applied >= 0),
    line_cash_paise   INTEGER NOT NULL CHECK (line_cash_paise >= 0),
    line_sparks       INTEGER NOT NULL CHECK (line_sparks >= 0),
    earnback_sparks   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ── Goals ──────────────────────────────────────────────────────────
CREATE TYPE goal_status AS ENUM ('ACTIVE', 'ACHIEVED', 'DROPPED');

CREATE TABLE goals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_sparks INTEGER NOT NULL CHECK (target_sparks > 0),
    status       goal_status NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX goals_one_active_per_user
    ON goals(user_id) WHERE status = 'ACTIVE';

-- ── updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wallets_updated  BEFORE UPDATE ON wallets  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_goals_updated    BEFORE UPDATE ON goals    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
