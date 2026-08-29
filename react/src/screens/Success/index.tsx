import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Gamepad2, Hourglass, Zap } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatPaise, formatSparks } from '@/lib/money';
import { Loading, ErrorPanel, formatDateTime } from '@/components/Feedback';
import { OrderStatusBadge } from '@/components/ui/badge';
import { ProductVisual } from '@/components/commerce/ProductVisual';

/**
 * Reads the settled order back from the server rather than trusting whatever
 * the checkout screen had in memory — so a refresh (or a deep link) shows the
 * same thing, and the numbers are the ones actually recorded.
 */
export const Success: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { wallet } = useAuth();
  const result = useApi(() => api.orders.get(id!), [id]);

  if (result.loading && !result.data) return <Loading />;
  if (result.error) return <ErrorPanel message={result.error} onRetry={result.reload} />;
  if (!result.data) return null;

  const order = result.data.order;
  const settled = order.status === 'PAID' || order.status === 'FULFILLED';
  const isSparksOnlyOrder = order.cashTotalPaise === 0;

  return (
    <section className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-4 flex justify-center">
          {settled ? (
            <span className="animate-burst rounded-full border-2 border-phosphor/60 bg-phosphor/10 p-3 text-phosphor glow-phosphor">
              <CheckCircle2 size={36} />
            </span>
          ) : (
            <span className="rounded-full border-2 border-amber/60 bg-amber/10 p-3 text-amber">
              <Hourglass size={36} className="animate-pulse" />
            </span>
          )}
        </div>

        {settled ? (
          <>
            <h1 className="animate-burst text-lg font-extrabold tracking-tight text-[#059669]">
              {isSparksOnlyOrder ? 'Reward Unlocked' : 'Order Confirmed'}
            </h1>
            <p className="mt-3 text-sm text-[#666057]">
              {isSparksOnlyOrder
                ? 'Paid entirely with Sparks you earned by playing.'
                : 'Payment succeeded and your Sparks have been spent.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-extrabold tracking-tight text-[#D97706]">
              Order {order.status.replace('_', ' ').toLowerCase()}
            </h1>
            <p className="mt-3 text-sm text-[#666057]">This order has not been paid.</p>
          </>
        )}
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="hud-label mb-1">ORDER</div>
            <code className="block truncate font-terminal text-sm text-cream-dim">{order.id}</code>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {order.items.map((item) => (
          <div key={item.id} className="mb-3 flex items-center gap-3 last:mb-0">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-edge bg-charcoal-deep">
              <ProductVisual
                sku={item.productSku}
                name={item.productName}
                imageUrl={item.imageUrl}
              />
            </div>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm text-cream">{item.productName}</b>
              <span className="text-xs text-cream-faint">
                Qty {item.qty} · {formatPaise(item.unitPricePaise)} each
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xs text-amber">⚡ {formatSparks(item.sparksApplied)}</span>
              <b className="text-sm text-cream">{formatPaise(item.lineCashPaise)}</b>
            </div>
          </div>
        ))}

        <div className="my-4 h-px bg-edge" />

        <div className="flex justify-between py-1 text-sm">
          <span className="text-cream-dim">Sparks spent</span>
          <b className="text-amber">⚡ {formatSparks(order.sparksTotal)}</b>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-cream-dim">Sparks value</span>
          <b className="text-cream">{formatPaise(order.sparksTotal)}</b>
        </div>
        <div className="mt-2 flex justify-between border-t-2 border-[#FDB827]/60 pt-3 text-base">
          <span className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
            {settled ? 'Cash paid' : 'Cash due'}
          </span>
          <b className="text-cream">{formatPaise(order.cashTotalPaise)}</b>
        </div>
        {order.earnbackSparks > 0 && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-cream-dim">
              {settled ? 'Earn-back credited' : 'Earn-back on payment'}
            </span>
            <b className="text-phosphor">⚡ {formatSparks(order.earnbackSparks)}</b>
          </div>
        )}
        <div className="flex justify-between py-1 text-xs text-cream-faint">
          <span>Placed</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
      </div>

      {/* ── Loop closure: earn-back is fuel for the next reward ──── */}
      {settled && order.earnbackSparks > 0 && (
        <div className="bento-card mt-4 border border-[#86EFAC]/60 bg-[#F0FDF4] p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white">
              <Zap size={15} fill="currentColor" />
            </span>
            <div className="min-w-0">
              <b className="block text-xs font-bold text-[#15803D]">
                +{formatSparks(order.earnbackSparks)} Sparks earned back
              </b>
              <span className="text-[0.7rem] text-[#047857]">
                Your purchase just funded your next reward — balance now{' '}
                {formatSparks(wallet.balance)} ⚡
              </span>
            </div>
          </div>
        </div>
      )}

      {order.shippingAddress && (
        <div className="bento-card mt-4 p-4">
          <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-[#948E84]">
            Shipping to
          </div>
          <p className="text-xs leading-relaxed text-[#666057]">
            {[
              order.shippingAddress.fullName,
              order.shippingAddress.line1,
              order.shippingAddress.line2,
              order.shippingAddress.city,
              order.shippingAddress.state,
              order.shippingAddress.pincode,
            ]
              .filter((part): part is string => typeof part === 'string' && part.length > 0)
              .join(', ')}
          </p>
        </div>
      )}

      {/* ── Loop closure: the primary CTA returns to the game ────── */}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#FDB827] px-5 text-sm font-bold text-[#191C1F] shadow-[0_4px_14px_-2px_rgba(253,184,39,0.4)] transition-all hover:bg-[#FFC444] active:scale-[0.98]"
        >
          <Gamepad2 size={16} /> Play next match
        </Link>
        <Link
          to="/store"
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#E6DFD2] bg-white px-5 text-sm font-semibold text-[#191B1D] shadow-sm transition-colors hover:bg-[#F9F5EE]"
        >
          Keep browsing
        </Link>
        <Link
          to="/orders"
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#666057] transition-colors hover:bg-[#F3ECE0] hover:text-[#191B1D]"
        >
          Order history
        </Link>
      </div>
    </section>
  );
};
