import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Package, Undo2, ShoppingBag } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useApi, errorMessage } from '@/lib/useApi';
import { useAuth } from '@/state/AuthContext';
import { formatPaise, formatSparks } from '@/lib/money';
import { Loading, ErrorPanel, InlineError, formatDateTime } from '@/components/Feedback';
import { OrderStatusBadge } from '@/components/ui/badge';
import { ProductVisual } from '@/components/commerce/ProductVisual';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OrderSummary } from '@/api/types';

const PAGE_SIZE = 10;

/**
 * Order history in warm luxury bento styling.
 */
export const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { setWallet, refreshWallet } = useAuth();
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orders = useApi(() => api.orders.list(PAGE_SIZE, offset), [offset]);
  const detail = useApi(
    () => (expanded ? api.orders.get(expanded) : Promise.resolve(null)),
    [expanded],
  );

  const list = orders.data?.orders ?? [];
  const total = orders.data?.total ?? 0;
  const shown = Math.min(offset + PAGE_SIZE, total);

  async function cancelOrder(order: OrderSummary) {
    setError(null);
    setCancelling(order.id);
    try {
      const result = await api.orders.cancel(order.id);
      setWallet(result.wallet);
      orders.reload();
    } catch (err) {
      setError(errorMessage(err));
      void refreshWallet();
    } finally {
      setCancelling(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-1">
          Your Activity
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191B1D]">Order History</h1>
        <p className="mt-1 text-sm text-[#666057]">
          Every reward redemption, Spark spend, and cash order detail.
        </p>
      </div>

      {error && <InlineError message={error} className="mb-4" />}

      {orders.loading && list.length === 0 && <Loading label="LOADING ORDERS" />}
      {orders.error && <ErrorPanel message={orders.error} onRetry={orders.reload} />}

      <div className="flex flex-col gap-3.5">
        {list.map((order: OrderSummary) => {
          const isOpen = expanded === order.id;
          const items = detail.data?.order.items;
          return (
            <div key={order.id} className="bento-card overflow-hidden transition-all">
              <button
                className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[#FAF6EE]/50"
                onClick={() => setExpanded(isOpen ? null : order.id)}
                aria-expanded={isOpen}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E6DFD2] bg-[#FAF5EB] text-[#191B1D]">
                  <Package size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <b className="font-mono text-sm font-bold text-[#191B1D]">#{order.id.slice(0, 8)}</b>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-xs text-[#8E877B]">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-[#191B1D]">
                    {order.cashTotalPaise > 0 ? formatPaise(order.cashTotalPaise) : 'Sparks only'}
                  </div>
                  {order.sparksTotal > 0 && (
                    <div className="text-xs font-bold text-[#D97706]">
                      ✦ {formatSparks(order.sparksTotal)} Sparks
                    </div>
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={cn(
                    'shrink-0 text-[#9B9489] transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-[#EFE8DC] bg-[#FAF6EE]/40 p-5">
                  {detail.loading && <p className="text-xs text-[#8E877B]">Loading items…</p>}
                  {items && (
                    <>
                      {items.map((item) => (
                        <div key={item.id} className="mb-3 flex items-center gap-3.5 last:mb-0">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E6DFD2] bg-white">
                            <ProductVisual
                              sku={item.productSku}
                              name={item.productName}
                              imageUrl={item.imageUrl}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <b className="block truncate text-xs font-bold text-[#191B1D]">{item.productName}</b>
                            <span className="text-[0.7rem] text-[#8E877B]">
                              Qty: {item.qty} · ✦ {formatSparks(item.sparksApplied)} Sparks ·{' '}
                              {formatPaise(item.lineCashPaise)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {order.earnbackSparks > 0 && (
                        <p className="mt-3 text-xs font-bold text-[#10B981]">
                          ✓ Earn-back credited: ✦ {formatSparks(order.earnbackSparks)} Sparks
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/orders/${order.id}/success`)}>
                          View Receipt
                        </Button>
                        {order.status === 'PENDING_PAYMENT' && (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={cancelling === order.id}
                            onClick={() => void cancelOrder(order)}
                          >
                            <Undo2 size={13} />
                            {cancelling === order.id ? 'Cancelling…' : 'Cancel & Release Sparks'}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {list.length === 0 && !orders.loading && (
        <div className="bento-card p-12 text-center">
          <div className="mb-3 flex justify-center text-[#9B9489]">
            <ShoppingBag size={36} />
          </div>
          <h2 className="text-base font-bold text-[#191B1D]">No Orders Placed Yet</h2>
          <p className="mt-1 mb-6 text-xs text-[#8E877B]">
            Redeem your first reward and track its shipment status here.
          </p>
          <Button variant="gold" onClick={() => navigate('/store')}>
            Browse Rewards
          </Button>
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
    </section>
  );
};
