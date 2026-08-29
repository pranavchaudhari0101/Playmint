import { query, withTransaction, DBClient } from '../db';
import { ApiError } from '../errors';
import { ledgerService, WalletState } from './ledgerService';

export interface GameProgressState {
  userId: string;
  gameId: string;
  unlockedLevel: number;
  completedLevels: number[];
  bestTimes: Record<number, number>;
  streakDays: number;
  streakMultiplier: number;
  dailyCap: number;
  dailyEarned: number;
  dailyRemaining: number;
  lastPlayedAt: string;
}

const DAILY_GAME_CAP = 1500; // Max sparks earnable per day from gameplay
const BASE_LEVEL_REWARD = 150;

/**
 * Calculates win streak multiplier:
 * 1 day / 1 win  -> 1.00x
 * 2 days / wins  -> 1.10x
 * 3-4 days / wins -> 1.25x
 * 5+ days / wins  -> 1.50x
 */
export function calculateStreakMultiplier(streak: number): number {
  if (streak <= 1) return 1.0;
  if (streak === 2) return 1.1;
  if (streak <= 4) return 1.25;
  return 1.5;
}

export const gameService = {
  async getProgress(userId: string, gameId = 'vector', client?: DBClient): Promise<GameProgressState> {
    const sql = `
      INSERT INTO game_progress (user_id, game_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, game_id) DO NOTHING;
    `;
    if (client) {
      await client.query(sql, [userId, gameId]);
    } else {
      await query(sql, [userId, gameId]);
    }

    const selectSql = `
      SELECT user_id AS "userId", game_id AS "gameId",
             unlocked_level AS "unlockedLevel",
             completed_levels AS "completedLevels",
             best_times AS "bestTimes",
             streak_days AS "streakDays",
             daily_sparks_earned AS "dailyEarned",
             daily_sparks_date AS "dailyDate",
             last_played_at AS "lastPlayedAt"
        FROM game_progress
       WHERE user_id = $1 AND game_id = $2
    `;
    const res = client ? await client.query(selectSql, [userId, gameId]) : await query(selectSql, [userId, gameId]);
    const row = res.rows[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const rowDateStr = row.dailyDate instanceof Date
      ? row.dailyDate.toISOString().split('T')[0]
      : String(row.dailyDate).split('T')[0];

    // Reset daily quota if a new day has rolled over
    const dailyEarned = rowDateStr === todayStr ? Number(row.dailyEarned) : 0;
    const dailyRemaining = Math.max(0, DAILY_GAME_CAP - dailyEarned);
    const streakDays = Number(row.streakDays) || 1;
    const streakMultiplier = calculateStreakMultiplier(streakDays);

    return {
      userId: row.userId,
      gameId: row.gameId,
      unlockedLevel: row.unlockedLevel,
      completedLevels: Array.isArray(row.completedLevels) ? row.completedLevels.map(Number) : [],
      bestTimes: (row.bestTimes && typeof row.bestTimes === 'object') ? row.bestTimes : {},
      streakDays,
      streakMultiplier,
      dailyCap: DAILY_GAME_CAP,
      dailyEarned,
      dailyRemaining,
      lastPlayedAt: row.lastPlayedAt,
    };
  },

  async completeLevel(
    userId: string,
    level: number,
    seconds: number,
    moves: number,
    gameId = 'vector'
  ): Promise<{
    progress: GameProgressState;
    wallet: WalletState;
    baseReward: number;
    streakBonus: number;
    totalEarned: number;
    alreadyCompleted: boolean;
  }> {
    if (!Number.isInteger(level) || level < 1 || level > 10) {
      throw ApiError.badRequest('Invalid level number (must be 1-10)');
    }
    if (!Number.isInteger(seconds) || seconds < 0) {
      throw ApiError.badRequest('Invalid completion time');
    }

    return withTransaction(async (client) => {
      // Lock progression row for this user
      await client.query(
        `INSERT INTO game_progress (user_id, game_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, game_id) DO NOTHING`,
        [userId, gameId]
      );

      const progRes = await client.query(
        `SELECT unlocked_level, completed_levels, best_times, streak_days,
                daily_sparks_earned, daily_sparks_date, last_played_at
           FROM game_progress
          WHERE user_id = $1 AND game_id = $2
            FOR UPDATE`,
        [userId, gameId]
      );
      const row = progRes.rows[0];

      const completedLevels: number[] = Array.isArray(row.completed_levels) ? row.completed_levels : [];
      const bestTimes: Record<string, number> = (row.best_times && typeof row.best_times === 'object') ? row.best_times : {};
      const alreadyCompleted = completedLevels.includes(level);

      // Update unlock state
      const nextUnlocked = Math.max(Number(row.unlocked_level), Math.min(10, level + 1));
      const nextCompleted = alreadyCompleted ? completedLevels : [...completedLevels, level];

      // Update best time for this level
      const prevBest = bestTimes[String(level)];
      if (prevBest === undefined || seconds < prevBest) {
        bestTimes[String(level)] = seconds;
      }

      // Check daily quota rollover
      const todayStr = new Date().toISOString().split('T')[0];
      const rowDateStr = row.daily_sparks_date instanceof Date
        ? row.daily_sparks_date.toISOString().split('T')[0]
        : String(row.daily_sparks_date).split('T')[0];
      let currentDailyEarned = rowDateStr === todayStr ? Number(row.daily_sparks_earned) : 0;

      // Streak check (if played yesterday vs today)
      let currentStreak = Number(row.streak_days) || 1;
      const lastPlayed = new Date(row.last_played_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }

      const multiplier = calculateStreakMultiplier(currentStreak);
      let baseReward = 0;
      let streakBonus = 0;
      let totalEarned = 0;

      if (!alreadyCompleted) {
        // First-time level clearance awards Sparks
        const rawReward = BASE_LEVEL_REWARD;
        const potentialTotal = Math.round(rawReward * multiplier);
        const remainingCap = Math.max(0, DAILY_GAME_CAP - currentDailyEarned);
        totalEarned = Math.min(potentialTotal, remainingCap);

        baseReward = Math.min(rawReward, totalEarned);
        streakBonus = Math.max(0, totalEarned - baseReward);

        if (totalEarned > 0) {
          currentDailyEarned += totalEarned;
          // Credit to double-entry ledger with idempotency
          await ledgerService.earn(
            client,
            userId,
            totalEarned,
            `Match won · Vector Level ${level} Cleared (+${baseReward}${streakBonus > 0 ? ` + ${streakBonus} streak bonus` : ''} ⚡)`,
            `vector:L${level}:${userId}`
          );
        }
      }

      // Update game_progress row
      await client.query(
        `UPDATE game_progress
            SET unlocked_level = $1,
                completed_levels = $2,
                best_times = $3,
                streak_days = $4,
                daily_sparks_earned = $5,
                daily_sparks_date = $6,
                last_played_at = CURRENT_TIMESTAMP
          WHERE user_id = $7 AND game_id = $8`,
        [
          nextUnlocked,
          nextCompleted,
          JSON.stringify(bestTimes),
          currentStreak,
          currentDailyEarned,
          todayStr,
          userId,
          gameId,
        ]
      );

      const wallet = await ledgerService.getWallet(userId, client);
      const progress = await this.getProgress(userId, gameId, client);

      return {
        progress,
        wallet,
        baseReward,
        streakBonus,
        totalEarned,
        alreadyCompleted,
      };
    });
  },
};
