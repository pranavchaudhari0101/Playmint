import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Target, Zap } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi, errorMessage } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatSparks, lineSparkCap } from '@/lib/money';
import { SparkCounter } from '@/components/system/SparkCounter';
import { RewardCard } from '@/components/commerce/RewardCard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ProductVisual } from '@/components/commerce/ProductVisual';
import type { CatalogProduct } from '@/api/types';

const MATCH_REWARD = 150;
/** "So close" = reachable within two more matches. */
const SO_CLOSE_MATCHES = 2;

interface EarnState {
  earned: number;
  balance: number;
}

/**
 * ─── The earn moment ───────────────────────────────────────────────
 * The bridge between gameplay and commerce. Arrives with { earned,
 * balance } from the match overlay; every downstream beat is derived
 * from real server data:
 *
 *   • first win      → "Rewards Store unlocked" introduction
 *   • new balance    → claimable-now rail (crossed this win)
 *   • near misses    → "so close" rail with one-tap Set as goal
 * ──────────────────────────────────────────────────────────────────
 */
export const EarnMoment: React.FC = () => {
  const location = useLocation();
  const { wallet } = useAuth();
  const state = location.state as EarnState | null;

  const products = useApi(() => api.catalog.products({ limit: 60 }), []);
  // The full tail tells us whether this was the player's first match win.
  const ledger = useApi(() => api.wallet.ledger(100, 0), []);
  const [goalBusy, setGoalBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    document.title = `+${state.earned} Sparks — SPARKS`;
    return () => {
      document.title = 'SPARKS — Play to unlock real rewards';
    };
  }, [state]);

  if (!state) return <Navigate to="/" replace />;

  const matchWins =
    ledger.data?.entries.filter(
      (e) => e.entryType === 'EARN' && /(match won|vector)/i.test(e.description ?? ''),
    ).length ?? 0;
  const isFirstWin = matchWins === 1;

  const all = products.data?.products ?? [];

  // Crossed the line THIS win: Sparks-only rewards now fully covered.
  const newlyClaimable = all
    .filter((p) => p.isSparksOnly)
    .filter((p) => {
      const cap = lineSparkCap(p, 1);
      return wallet.balance >= cap && wallet.balance - state.earned < cap;
    })
    .slice(0, 4);

  // Near misses: Sparks-only rewards ≤ N matches away, cheapest first.
  const soClose = all
    .filter((p) => p.isSparksOnly && !newlyClaimable.some((n) => n.id === p.id))
    .map((p) => {
      const cap = lineSparkCap(p, 1);
      const shortBy = Math.max(0, cap - wallet.balance);
      return { product: p, cap, shortBy, matches: Math.ceil(shortBy / MATCH_REWARD) };
    })
    .filter((r) => r.shortBy > 0 && r.matches <= SO_CLOSE_MATCHES)
    .sort((a, b) => a.shortBy - b.shortBy)
    .slice(0, 3);

  async function setGoal(product: CatalogProduct) {
    setGoalBusy(product.id);
    try {
      await api.goals.set(product.id);
      toast.success('Goal set', {
        description: `${product.name} — every match now brings it closer.`,
      });
    } catch (err) {
      toast.error('Could not set goal', { description: errorMessage(err) });
    } finally {
      setGoalBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-lg">
      <div className="bento-card relative overflow-hidden bg-gradient-to-b from-white via-white to-[#FFF6DC] p-10 text-center">
        {/* ambient golden glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 h-64 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#FFF2D0] blur-[70px]"
          aria-hidden
        />

        <div className="relative z-10">
          <div className="mb-5 flex justify-center">
            <span className="animate-burst flex h-16 w-16 items-center justify-center rounded-full bg-[#FDB827] text-[#191C1F] shadow-[0_8px_24px_-4px_rgba(253,184,39,0.5)]">
              <Zap size={32} fill="currentColor" />
            </span>
          </div>

          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#948E84]">
            Match Complete · Victory
          </div>

          <div className="animate-burst mb-3 text-5xl font-extrabold tracking-tight text-[#191B1D] tabular-nums">
            +{state.earned}
          </div>

          <SparkCounter value={wallet.balance} className="mb-4 justify-center" />

          <p className="text-sm text-[#666057]">
            Recorded in your ledger — Sparks can't be faked, bought, or cashed out.
          </p>

          {/* ── First win: introduce the store ─────────────────────── */}
          {isFirstWin && (
            <div className="animate-burst mx-auto mt-6 max-w-sm rounded-2xl border border-[#F3E3B9] bg-[#FFFBF0] p-4 text-left shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDB827] text-sm">
                  🎖
                </span>
                <div>
                  <b className="text-sm font-bold text-[#191B1D]">Rewards Store unlocked</b>
                  <p className="text-xs leading-snug text-[#666057]">
                    Your Sparks work like money here — spend them alone, or mix with cash.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
            <Link
              to="/store"
              className="inline-block w-full rounded-full bg-[#FDB827] px-4 py-3 text-sm font-bold text-[#191C1F] shadow-[0_4px_14px_-2px_rgba(253,184,39,0.4)] transition-all hover:bg-[#FFC444] active:scale-[0.98]"
            >
              {isFirstWin ? 'Explore the Rewards Store' : 'See what I can unlock'}
            </Link>
            <Link
              to="/"
              className="inline-block w-full rounded-full border border-[#E6DFD2] bg-white px-4 py-3 text-sm font-semibold text-[#191B1D] shadow-sm transition-colors hover:bg-[#F9F5EE]"
            >
              Keep playing
            </Link>
          </div>
        </div>
      </div>

      {/* ── Crossed the line this win ──────────────────────────────── */}
      {newlyClaimable.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#948E84]">
            You just unlocked these — claim with Sparks only
          </div>
          <div className="grid grid-cols-2 gap-4">
            {newlyClaimable.map((product) => (
              <RewardCard key={product.id} product={product} balance={wallet.balance} />
            ))}
          </div>
        </div>
      )}

      {/* ── So close: convert momentum into a return reason ───────── */}
      {soClose.length > 0 && (
        <div className="bento-card mt-8 p-5">
          <div className="mb-1 flex items-center gap-2">
            <Target size={15} className="text-[#B45309]" />
            <b className="text-sm font-bold text-[#191B1D]">So close</b>
          </div>
          <p className="mb-4 text-xs text-[#666057]">
            Two more matches and these are yours. Set one as your goal — we'll track it on the home
            screen.
          </p>
          <div className="flex flex-col gap-2.5">
            {soClose.map(({ product, cap, shortBy, matches }) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFE9DE] bg-[#FAF6EE] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#E6DFD2] bg-white">
                    <ProductVisual
                      sku={product.sku}
                      name={product.name}
                      imageUrl={product.imageUrl}
                    />
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-xs font-bold text-[#191B1D]">{product.name}</b>
                    <span className="text-[0.7rem] font-semibold text-[#B45309]">
                      ⚡ {formatSparks(cap)} · {formatSparks(shortBy)} to go
                    </span>
                    <span className="ml-1 text-[0.7rem] font-bold text-[#059669]">
                      ~{matches} match{matches === 1 ? '' : 'es'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={goalBusy !== null}
                  onClick={() => void setGoal(product)}
                >
                  {goalBusy === product.id ? 'Setting…' : 'Set as goal'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
