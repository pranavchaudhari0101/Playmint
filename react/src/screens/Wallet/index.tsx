import React, { useState } from 'react';
import {} from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Scale, Sparkles } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatSparks, sparksWithCashValue } from '@/lib/money';
import { Loading, ErrorPanel, formatDateTime } from '@/components/Feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SparkCounter } from '@/components/system/SparkCounter';
import { cn } from '@/lib/utils';
import type { LedgerEntryType } from '@/api/types';

const ENTRY_META: Record<LedgerEntryType, { label: string; variant: 'phosphor' | 'amber' | 'rust' | 'default' }> = {
  EARN: { label: 'EARN', variant: 'phosphor' },
  RESERVE: { label: 'RESERVE', variant: 'amber' },
  COMMIT: { label: 'COMMIT', variant: 'default' },
  RELEASE: { label: 'RELEASE', variant: 'phosphor' },
  ADJUSTMENT: { label: 'ADJUST', variant: 'rust' },
};

const PAGE_SIZE = 15;

/**
 * The wallet: live balance, lifetime totals, and the append-only ledger.
 */
export const Wallet: React.FC = () => {
  const { wallet } = useAuth();
  const [offset, setOffset] = useState(0);
  const ledger = useApi(() => api.wallet.ledger(PAGE_SIZE, offset), [offset]);

  const entries = ledger.data?.entries ?? [];
  const total = ledger.data?.total ?? 0;
  const shown = Math.min(offset + PAGE_SIZE, total);

  return (
    <section className="space-y-6">
      {/* ── Balance Hero ─────────────────────────────────────────── */}
      <div className="bento-card relative overflow-hidden p-8 text-center bg-gradient-to-b from-white via-white to-[#FFF9EC]">
        <div className="relative z-10">
          <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-3">
            Sparks Balance & Wallet
          </div>
          <div className="mb-3 flex justify-center">
            <SparkCounter value={wallet.balance} />
          </div>
          <p className="text-sm font-semibold text-[#10B981]">
            Equivalent to {sparksWithCashValue(wallet.balance)} · Earned through gameplay only
          </p>
        </div>
      </div>

      {/* ── Lifetime stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'LIFETIME EARNED', value: formatSparks(wallet.lifetimeEarned), tone: 'text-[#10B981]' },
          { label: 'LIFETIME SPENT', value: formatSparks(wallet.lifetimeSpent), tone: 'text-[#D97706]' },
          {
            label: 'OUTSTANDING LIAB.',
            value: formatSparks(wallet.lifetimeEarned - wallet.lifetimeSpent),
            tone: 'text-[#191B1D]',
          },
        ].map((stat) => (
          <div key={stat.label} className="bento-card p-5 text-center">
            <div className={cn('text-xl font-extrabold tracking-tight', stat.tone)}>{stat.value}</div>
            <div className="text-[0.65rem] font-bold text-[#8E877B] mt-1 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── How Sparks Work Card ─────────────────────────────────── */}
      <div className="bento-card p-5 border border-[#E6DFD2]">
        <div className="mb-1.5 flex items-center gap-2">
          <Scale size={15} className="text-[#D97706]" />
          <b className="text-xs font-bold text-[#191B1D]">HOW SPARKS WORK</b>
        </div>
        <p className="text-xs leading-relaxed text-[#666057]">
          100 Sparks = ₹1. Sparks are earned through gameplay and selected reward actions. They
          cannot be bought, cashed out, or transferred. Every entry below is an immutable row in
          the server's ledger.
        </p>
      </div>

      {/* ── Ledger ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#191B1D] tracking-tight">
            Recent Activity
          </h2>
          <span className="text-xs font-medium text-[#8E877B]">
            {total} entries · showing {shown}
          </span>
        </div>

        {ledger.loading && entries.length === 0 && <Loading label="READING LEDGER" />}
        {ledger.error && <ErrorPanel message={ledger.error} onRetry={ledger.reload} />}

        <div className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const meta = ENTRY_META[entry.entryType] ?? { label: entry.entryType, variant: 'default' as const };
            const positive = entry.amount > 0;
            return (
              <div
                key={entry.id}
                className="bento-card flex items-center gap-3.5 p-4"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    positive ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-[#FEF2F2] text-[#B91C1C]',
                  )}
                >
                  {positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>

                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-bold text-[#191B1D]">
                    {entry.description ?? meta.label}
                  </b>
                  <span className="text-xs text-[#8E877B]">
                    {formatDateTime(entry.createdAt)}
                    {entry.referenceId && ` · Ref: ${entry.referenceId.slice(0, 8)}`}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <b
                    className={cn(
                      'block text-sm font-extrabold',
                      positive ? 'text-[#10B981]' : 'text-[#DC2626]',
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatSparks(entry.amount)}
                  </b>
                  <Badge variant={meta.variant} className="mt-1 text-[0.6rem]">
                    {meta.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {entries.length === 0 && !ledger.loading && (
          <div className="bento-card p-8 text-center">
            <Sparkles size={24} className="mx-auto mb-2 text-[#8E877B]" />
            <p className="text-xs text-[#8E877B]">No transactions yet. Play a match to earn.</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          {offset > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              ← Newer
            </Button>
          )}
          {shown < total && (
            <Button variant="secondary" size="sm" onClick={() => setOffset(offset + PAGE_SIZE)}>
              Older →
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
