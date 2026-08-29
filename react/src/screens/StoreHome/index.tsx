import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi, errorMessage } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { RewardRail } from '@/components/commerce/RewardRail';
import { formatSparks, lineSparkCap } from '@/lib/money';
import { Loading, ErrorPanel } from '@/components/Feedback';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ProductVisual } from '@/components/commerce/ProductVisual';
import type { CatalogProduct } from '@/api/types';

const MATCH_REWARD = 150;
const SO_CLOSE_MATCHES = 2;

export const StoreHome: React.FC = () => {
  const { wallet } = useAuth();
  const [goalBusy, setGoalBusy] = useState<string | null>(null);

  const categories = useApi(() => api.catalog.categories(), []);
  const products = useApi(() => api.catalog.products({ limit: 60 }), []);

  async function setGoal(product: CatalogProduct) {
    setGoalBusy(product.id);
    try {
      await api.goals.set(product.id);
      toast.success('Goal set', {
        description: `${product.name} — track progress on the home screen.`,
      });
    } catch (err) {
      toast.error('Could not set goal', { description: errorMessage(err) });
    } finally {
      setGoalBusy(null);
    }
  }

  if (products.loading && !products.data) return <Loading label="LOADING REWARDS" />;
  if (products.error) return <ErrorPanel message={products.error} onRetry={products.reload} />;

  const all = products.data?.products ?? [];

  // Rails are derived from server data; affordability compares the wallet
  // against the server's own eligible cap for a single unit.
  const claimableNow = all.filter((p) => p.isSparksOnly && wallet.balance >= lineSparkCap(p, 1));
  const sparksOnly = all.filter(
    (p) => p.isSparksOnly && wallet.balance < lineSparkCap(p, 1),
  );
  const hybrid = all.filter((p) => !p.isSparksOnly);

  // "So close" — Spark-only rewards within two matches, cheapest first.
  const soClose = sparksOnly
    .map((p) => {
      const cap = lineSparkCap(p, 1);
      const shortBy = cap - wallet.balance;
      return { product: p, cap, shortBy, matches: Math.ceil(shortBy / MATCH_REWARD) };
    })
    .filter((r) => r.matches <= SO_CLOSE_MATCHES)
    .sort((a, b) => a.shortBy - b.shortBy)
    .slice(0, 3);

  return (
    <section>
      {/* ── Store Header Banner ───────────────────────────────────── */}
      <div className="bento-card mb-8 p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-white via-white to-[#FFF8E7]">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FDB827] text-[0.6rem] font-bold text-[#191B1D]">
              ✦
            </span>
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#9B9489]">
              Rush Arena · Rewards Store
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191B1D]">
            Turn your play into real rewards.
          </h1>
          <p className="mt-2 text-sm text-[#666057]">
            You hold <strong className="text-[#191B1D] font-bold">{formatSparks(wallet.balance)} Sparks</strong>. Redeem for hardware, gift cards, gear, and exclusive drops.
          </p>
        </div>

        {/* Ambient Gold Icon Deco */}
        <div className="pointer-events-none absolute -right-4 -bottom-6 text-[120px] text-[#FDB827]/10 select-none">
          ✦
        </div>
      </div>

      {/* ── Category Pill Filter Rail ─────────────────────────────── */}
      {categories.data && categories.data.categories.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Link
            to="/store"
            className="rounded-full bg-[#1C1F22] text-white px-4 py-1.5 text-xs font-semibold shadow-xs"
          >
            All Categories ({all.length})
          </Link>
          {categories.data.categories.map((category) => (
            <Link
              key={category.id}
              to={`/store/${category.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#E6DFD2] bg-white px-4 py-1.5 text-xs font-semibold text-[#666057] shadow-xs hover:border-[#FDB827] hover:text-[#191B1D] hover:bg-[#FAF6EE] transition-all"
            >
              <span>{category.name}</span>
              <span className="rounded-full bg-[#FAF5EB] px-2 py-0.5 text-[0.65rem] font-bold text-[#8E877B]">
                {category.productCount}
              </span>
            </Link>
          ))}
        </div>
      )}

      <RewardRail
        title="CLAIM WITH SPARKS ALONE"
        subtitle="Your balance already covers these in full"
        products={claimableNow}
        balance={wallet.balance}
      />

      {/* ── So close: ≤2 matches away, one-tap goal ──────────────── */}
      {soClose.length > 0 && (
        <div className="bento-card mb-10 p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <Target size={15} className="text-[#B45309]" />
            <b className="text-sm font-bold text-[#191B1D]">Two matches away</b>
          </div>
          <p className="mb-4 text-xs text-[#666057]">
            Win twice more and these are yours entirely with Sparks.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {soClose.map(({ product, cap, shortBy, matches }) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFE9DE] bg-[#FAF6EE] p-3"
              >
                <Link to={`/product/${product.id}`} className="flex min-w-0 items-center gap-3">
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
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={goalBusy !== null}
                  onClick={() => void setGoal(product)}
                >
                  {goalBusy === product.id ? 'Setting…' : 'Goal'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <RewardRail
        title="PAY WITH SPARKS + CASH"
        subtitle="Apply Sparks to cut the cash you pay"
        products={hybrid}
        balance={wallet.balance}
      />

      <RewardRail
        title="KEEP PLAYING TO UNLOCK"
        subtitle="Sparks-only rewards still out of reach"
        products={sparksOnly}
        balance={wallet.balance}
      />

      {all.length === 0 && (
        <div className="bento-card mx-auto max-w-md p-8 text-center">
          <div className="mb-2 text-4xl" aria-hidden>
            📡
          </div>
          <h2 className="text-sm font-bold text-[#191B1D]">No rewards available yet</h2>
          <p className="mt-2 text-xs text-[#8E877B]">
            Seed the catalogue with <code className="font-mono text-[#D97706]">npm run seed</code> in the backend.
          </p>
        </div>
      )}
    </section>
  );
};
