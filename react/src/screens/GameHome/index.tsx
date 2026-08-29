import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Zap } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatSparks, sparksWithCashValue, lineSparkCap } from '@/lib/money';
import { ProgressTrack } from '@/components/system/ProgressTrack';
import { SparkCounter } from '@/components/system/SparkCounter';
import { RewardRail } from '@/components/commerce/RewardRail';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/components/Feedback';

const MATCH_REWARD = 150;

/**
 * ─── GameHome — the core loop, made obvious ────────────────────────
 * One screen answers a new user's three questions:
 *   1. What do I do?        → Play Vector (the one big button)
 *   2. What have I earned?  → live balance, real ledger tail
 *   3. What can I get?      → rewards the balance already covers
 * The playable puzzle lives at /play; Sparks credit happens there via
 * the server ledger. Every number below comes from the server.
 * ──────────────────────────────────────────────────────────────────
 */
export const GameHome: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, user } = useAuth();

  const goals = useApi(() => api.goals.active(), []);
  const goal = goals.data?.goal ?? null;

  const products = useApi(() => api.catalog.products({ limit: 60 }), []);
  const all = products.data?.products ?? [];

  const ledger = useApi(() => api.wallet.ledger(3, 0), []);
  const recent = ledger.data?.entries ?? [];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Player';
  const sessionsToGoal = goal ? Math.ceil(goal.remainingSparks / MATCH_REWARD) : 0;

  // Real affordability: balance vs the server's own cap per unit.
  const claimableNow = all.filter((p) => p.isSparksOnly && wallet.balance >= lineSparkCap(p, 1));
  const hybrid = all.filter((p) => !p.isSparksOnly).slice(0, 4);

  return (
    <section className="space-y-8">
      {/* ── 1. Hero: what this is + the one action ─────────────────── */}
      <div className="bento-card relative overflow-hidden bg-gradient-to-br from-white via-white to-[#FFF6DC] p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#948E84]">
              Welcome back
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#191B1D] sm:text-3xl">
              {displayName}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#666057]">
              Solve puzzles in Rush Arena to earn Sparks, then spend them on real rewards. 100
              Sparks = ₹1 — they can't be bought or cashed out, only earned.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={() => navigate('/play')}>
                <Zap size={17} fill="currentColor" />
                Play Vector · +{MATCH_REWARD} Sparks a level
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/store')}>
                Browse Rewards <ArrowRight size={16} />
              </Button>
            </div>
          </div>

          {/* Balance panel — the reward for playing, always visible */}
          <button
            className="w-full max-w-xs shrink-0 rounded-3xl border border-[#F3E3B9] bg-[#FFFBF0] p-6 text-left shadow-sm transition-all hover:shadow-[0_10px_30px_-10px_rgba(253,184,39,0.35)] lg:w-64"
            onClick={() => navigate('/wallet')}
            title="Open wallet"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-[#948E84]">
              Your balance
            </div>
            <div className="mt-2">
              <SparkCounter value={wallet.balance} />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#059669]">
              {sparksWithCashValue(wallet.balance)} ready to spend
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#B45309]">
              View wallet <ArrowRight size={12} />
            </span>
          </button>
        </div>
      </div>

      {/* ── 2. Goal: the reason to come back ───────────────────────── */}
      {goal ? (
        <div className="bento-card border-[#FDB827]/40 bg-[#FFFDF7] p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDB827] text-[#191B1D] shadow-sm">
                <Target size={17} />
              </span>
              <div>
                <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[#948E84]">
                  Your goal
                </div>
                <b className="text-sm text-[#191B1D]">{goal.productName}</b>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/goal"
                className="rounded-full border border-[#E6DFD2] bg-white px-3.5 py-1.5 text-xs font-bold text-[#191B1D] shadow-xs transition-colors hover:bg-[#F4EDE2]"
              >
                View goal
              </Link>
              <Link
                to={`/product/${goal.productId}`}
                className="rounded-full bg-[#191C1F] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#2C3137]"
              >
                {goal.remainingSparks === 0 ? 'Redeem now' : 'View reward'}
              </Link>
            </div>
          </div>
          <ProgressTrack
            value={goal.progressSparks}
            max={goal.targetSparks}
            label={`${formatSparks(goal.progressSparks)} / ${formatSparks(goal.targetSparks)} Sparks`}
            rightLabel={
              goal.remainingSparks === 0
                ? 'Goal reached — redeem it!'
                : `${formatSparks(goal.remainingSparks)} to go · ~${sessionsToGoal} match${sessionsToGoal === 1 ? '' : 'es'}`
            }
          />
        </div>
      ) : (
        <div className="bento-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF3E0] text-[#B45309]">
              <Target size={17} />
            </span>
            <div>
              <b className="text-sm text-[#191B1D]">Chase a reward</b>
              <p className="text-xs text-[#666057]">
                Set a goal and every match brings it closer.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/store')}>
            Pick a goal <ArrowRight size={13} />
          </Button>
        </div>
      )}

      {/* ── 3. What you can already get — real rails ──────────────── */}
      <RewardRail
        title="Claim now with Sparks"
        subtitle="Your balance already covers these in full — no cash needed"
        products={claimableNow}
        balance={wallet.balance}
        viewAllTo="/store"
      />

      <RewardRail
        title="Popular rewards"
        subtitle="Apply Sparks to cut the cash price"
        products={hybrid}
        balance={wallet.balance}
        viewAllTo="/store"
      />

      {/* ── 4. Recent activity — real ledger tail ──────────────────── */}
      <div className="bento-card p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#191B1D]">Recent activity</h2>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#B45309] hover:underline"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-[#968F83]">
            Nothing yet — play your first match to earn Sparks.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-[#666057]">
                  {entry.description ?? entry.entryType}
                  <span className="ml-2 text-[#968F83]">{formatDateTime(entry.createdAt)}</span>
                </span>
                <b
                  className={
                    entry.amount >= 0
                      ? 'shrink-0 font-bold text-[#059669]'
                      : 'shrink-0 font-bold text-[#DC2626]'
                  }
                >
                  {entry.amount > 0 ? '+' : ''}
                  {formatSparks(entry.amount)} ⚡
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
