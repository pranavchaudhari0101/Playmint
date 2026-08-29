-- ═══════════════════════════════════════════════════════════════════
-- PlaySuper Sparks — Migration 002: Server-Synced Game Progression & Economy Quotas
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS game_progress (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id              VARCHAR(50) NOT NULL DEFAULT 'vector',
    unlocked_level       INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_level >= 1),
    completed_levels     INTEGER[] NOT NULL DEFAULT '{}',
    best_times           JSONB NOT NULL DEFAULT '{}'::jsonb,
    streak_days          INTEGER NOT NULL DEFAULT 1 CHECK (streak_days >= 0),
    daily_sparks_earned  INTEGER NOT NULL DEFAULT 0 CHECK (daily_sparks_earned >= 0),
    daily_sparks_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    last_played_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT game_progress_user_game_unique UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_progress_user ON game_progress(user_id, game_id);

CREATE TRIGGER trg_game_progress_updated
    BEFORE UPDATE ON game_progress
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
