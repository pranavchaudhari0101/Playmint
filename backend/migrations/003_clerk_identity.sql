-- ═══════════════════════════════════════════════════════════════════
-- Playmint — Migration 003: Clerk identity
--
-- Identity moves to Clerk. The local users row is provisioned lazily on
-- the first authenticated request: existing rows (seeded demo accounts)
-- are linked by email; new emails get a fresh row plus the welcome
-- bonus. Legacy password credentials become optional.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Clerk-provisioned users have no local password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id
    ON users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
