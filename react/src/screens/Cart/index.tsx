import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { useQuote } from '@/lib/useQuote';
import { formatPaise, formatSparks, lineSparkCap, slidableMax } from '@/lib/money';
import { InlineError } from '@/components/Feedback';
import { SparkSlider } from '@/components/system/SparkSlider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductVisual } from '@/components/commerce/ProductVisual';
import { cn } from '@/lib/utils';

export const CartScreen: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useAuth();
  const { lines, quoteItems, remove, setQty, setSparks, clear } = useCart();
  const { quote, error, pending } = useQuote(quoteItems);

  if (lines.length === 0) {
    return (
      <section className="bento-card mx-auto max-w-md p-10 text-center">
        <div className="mb-4 flex justify-center text-[#9B9489]">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF5EB] text-[#191B1D] shadow-xs">
            <ShoppingCart size={30} />
          </span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#191B1D]">Your Cart is Empty</h1>
        <p className="mt-2 mb-6 text-sm text-[#666057]">
          Browse rewards your Sparks can unlock — or win a match in Rush Arena to earn more.
        </p>
        <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button variant="gold" onClick={() => navigate('/store')}>
            Browse Rewards
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Earn Sparks in Rush Arena
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Link
        to="/store"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DFD2] bg-white px-4 py-1.5 text-xs font-bold text-[#666057] shadow-xs hover:text-[#191B1D] hover:bg-[#FAF6EE] transition-all"
      >
        <ArrowLeft size={14} /> Continue Shopping
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-1">
            Checkout Preparation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191B1D]">Your Cart</h1>
          <p className="mt-1 text-sm text-[#666057]">
            You hold <strong className="text-[#191B1D]">{formatSparks(wallet.balance)} Sparks</strong>. Allocate how many Sparks you wish to redeem.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 size={13} /> Clear Cart
        </Button>
      </div>

      {error && <InlineError message={error} className="mb-5" />}

      <div className="bento-card p-6 sm:p-8">
        {lines.map((line) => {
          const cap = lineSparkCap(line.product, line.qty);
          const max = slidableMax(line.product, line.qty, wallet.balance);
          const quoted = quote?.lines.find((l) => l.productId === line.productId);

          return (
            <div key={line.productId} className="mb-6 border-b border-[#EFE8DC] pb-6 last:mb-0 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-4">
                <div className="h-18 w-18 shrink-0 overflow-hidden rounded-2xl border border-[#E6DFD2] bg-[#FAF5EB]">
                  <ProductVisual
                    sku={line.product.sku}
                    name={line.product.name}
                    imageUrl={line.product.imageUrl}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-[#191B1D]">{line.product.name}</h3>
                  <p className="text-xs text-[#8E877B]">
                    {line.product.isSparksOnly
                      ? 'Sparks-only reward'
                      : `${formatPaise(line.product.cashPricePaise)} each`}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-xs font-bold text-[#8E877B]">Quantity:</span>
                    <Select
                      value={String(line.qty)}
                      onValueChange={(v) => setQty(line.productId, Number(v))}
                    >
                      <SelectTrigger className="h-8 w-20 rounded-full border-[#E6DFD2] bg-white text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <button
                  className="rounded-full p-2.5 text-[#9B9489] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                  onClick={() => remove(line.productId)}
                  aria-label={`Remove ${line.product.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* ── Spark Allocation ─────────────────────────────── */}
              <div className="mt-4 rounded-2xl border border-[#E6DFD2] bg-[#FAF6EE] p-5">
                {line.product.isSparksOnly ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9B9489]">Sparks Required</span>
                      <span className="flex items-center gap-1 text-sm font-extrabold text-[#191B1D]">
                        <span className="text-[#FDB827]">✦</span> {formatSparks(cap)} Sparks
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#8E877B]">
                      Sparks-only reward: the full amount is covered by your earned balance.
                    </p>
                    {wallet.balance < cap && (
                      <p className="mt-2 text-xs font-semibold text-[#EF4444]">
                        ⚠ {formatSparks(cap - wallet.balance)} more Sparks needed in your wallet.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <SparkSlider
                      value={line.sparksApplied}
                      max={max}
                      cap={cap}
                      onChange={(next) => setSparks(line.productId, next)}
                      ariaLabel={`Sparks applied to ${line.product.name}`}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#8E877B]">
                        Sparks cover{' '}
                        <strong className="font-bold text-[#D97706]">
                          {formatPaise(line.sparksApplied)}
                        </strong>{' '}
                        of this line
                      </span>
                      {quoted && (
                        <span className="font-bold text-[#191B1D]">
                          Remaining Cash: {formatPaise(quoted.lineCashPaise)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Server Totals Bento Card ─────────────────────────────── */}
        <div className={cn('mt-6 rounded-2xl bg-[#FAF6EE] border border-[#E6DFD2] p-5 transition-opacity', pending && 'opacity-60')}>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-[#666057]">Item subtotal</span>
            <b className="text-[#191B1D]">
              {quote
                ? formatPaise(
                    quote.lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0),
                  )
                : '—'}
            </b>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-[#666057]">Sparks applied</span>
            <b className="text-[#D97706]">✦ {quote ? formatSparks(quote.sparksTotal) : '—'}</b>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-[#666057]">Sparks discount</span>
            <b className="text-[#10B981]">−{quote ? formatPaise(quote.sparksTotal) : '—'}</b>
          </div>
          <div className="mt-3 flex justify-between border-t border-[#E6DFD2] pt-3 text-base">
            <span className="font-bold text-[#191B1D]">
              Cash Payable
            </span>
            <b className="text-xl font-extrabold text-[#191B1D]">{quote ? formatPaise(quote.cashTotalPaise) : '—'}</b>
          </div>
          {quote && quote.earnbackSparks > 0 && (
            <div className="mt-2 flex justify-between border-t border-dashed border-[#E6DFD2] pt-2 text-xs">
              <span className="text-[#666057]">Earn-back reward after checkout</span>
              <b className="text-[#10B981]">✦ +{formatSparks(quote.earnbackSparks)} Sparks</b>
            </div>
          )}
        </div>

        {quote && !quote.sufficientBalance && (
          <InlineError
            className="mt-4"
            message={`This split needs ${formatSparks(quote.sparksTotal)} Sparks but your balance is ${formatSparks(quote.walletBalance)}. Reduce the Sparks applied or win more matches.`}
          />
        )}

        <Button
          variant="gold"
          size="lg"
          block
          className="mt-6"
          disabled={!quote || !quote.sufficientBalance || pending}
          onClick={() => navigate('/checkout')}
        >
          {pending ? 'Computing Quote…' : 'Continue to Checkout'}
        </Button>
      </div>
    </section>
  );
};
