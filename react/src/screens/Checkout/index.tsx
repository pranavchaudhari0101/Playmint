import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hourglass, XCircle } from 'lucide-react';
import { api } from '@/api/endpoints';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { useQuote } from '@/lib/useQuote';
import { errorMessage } from '@/lib/useApi';
import { formatPaise, formatSparks } from '@/lib/money';
import { InlineError } from '@/components/Feedback';
import { MockPaymentModal } from '@/components/MockPaymentModal';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import type { OrderView, PaymentIntent, SettleResult, ShippingAddress } from '@/api/types';

const ADDRESS_KEY = 'sparks.address';

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

/** Prefill for the demo — one click instead of seven fields. */
const DEMO_ADDRESS: ShippingAddress = {
  fullName: 'Ishita Gawande',
  phone: '9810012345',
  line1: '27 MG Road',
  line2: 'Sector 14',
  city: 'Gurugram',
  state: 'Haryana',
  pincode: '122001',
};

function loadAddress(): ShippingAddress {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (!raw) return DEMO_ADDRESS;
    return { ...EMPTY_ADDRESS, ...(JSON.parse(raw) as Partial<ShippingAddress>) };
  } catch {
    return DEMO_ADDRESS;
  }
}

/** Mirrors the zod schema on POST /checkout/orders so we fail before the round trip. */
function missingFields(a: ShippingAddress): string[] {
  const problems: string[] = [];
  if (a.fullName.trim().length < 1) problems.push('Full name');
  if (a.phone.trim().length < 6) problems.push('Phone (at least 6 digits)');
  if (a.line1.trim().length < 1) problems.push('Address line 1');
  if (a.city.trim().length < 1) problems.push('City');
  if (a.state.trim().length < 1) problems.push('State');
  if (a.pincode.trim().length < 4) problems.push('PIN code (at least 4 digits)');
  return problems;
}

type Stage =
  | { kind: 'form' }
  | { kind: 'paying'; order: OrderView; intent: PaymentIntent }
  | { kind: 'pending'; order: OrderView; intent: PaymentIntent }
  | { kind: 'failed'; order: OrderView };

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, setWallet } = useAuth();
  const { lines, quoteItems, clear } = useCart();
  const { quote, error: quoteError, pending: quotePending } = useQuote(quoteItems);

  const [address, setAddress] = useState<ShippingAddress>(loadAddress);
  const [stage, setStage] = useState<Stage>({ kind: 'form' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const requiresShipping = lines.some((line) => !line.product.isSparksOnly);
  const problems = requiresShipping ? missingFields(address) : [];

  if (lines.length === 0 && stage.kind === 'form') {
    return (
      <section className="bento-card mx-auto max-w-md p-10 text-center">
        <h1 className="text-lg font-bold text-[#191B1D]">Nothing to Check Out</h1>
        <p className="mt-2 mb-6 text-xs text-[#8E877B]">Your cart is empty.</p>
        <Button variant="gold" onClick={() => navigate('/store')}>
          Browse Rewards
        </Button>
      </section>
    );
  }

  function field(key: keyof ShippingAddress, label: string, extra?: { optional?: boolean }) {
    const value = (address[key] ?? '').trim();
    const missingRule =
      key === 'phone' ? value.length < 6 : key === 'pincode' ? value.length < 4 : value.length < 1;
    const invalid = showErrors && !extra?.optional && missingRule;
    return (
      <div className="mb-4">
        <Label htmlFor={`addr-${key}`}>
          {label}
          {extra?.optional && <span className="font-normal text-[#9B9489]"> (optional)</span>}
        </Label>
        <Input
          id={`addr-${key}`}
          invalid={invalid || undefined}
          value={address[key] ?? ''}
          onChange={(e) => setAddress((prev) => ({ ...prev, [key]: e.target.value }))}
        />
      </div>
    );
  }

  async function placeOrder() {
    setError(null);

    if (problems.length > 0) {
      setShowErrors(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload: ShippingAddress | undefined = requiresShipping
        ? {
            ...address,
            ...(address.line2?.trim() ? { line2: address.line2.trim() } : { line2: undefined }),
          }
        : undefined;

      const result = await api.checkout.createOrder(quoteItems, payload);

      setWallet(result.wallet);
      localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));

      if (result.intent === null) {
        clear();
        navigate(`/orders/${result.order.id}/success`, { replace: true });
        return;
      }

      setStage({ kind: 'paying', order: result.order, intent: result.intent });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSettled(result: SettleResult, outcome: 'SUCCESS' | 'FAILURE') {
    setWallet(result.wallet);

    if (outcome === 'SUCCESS') {
      clear();
      navigate(`/orders/${result.order.id}/success`, { replace: true });
    } else {
      setStage({ kind: 'failed', order: result.order });
    }
  }

  async function cancelPending(order: OrderView) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.orders.cancel(order.id);
      setWallet(result.wallet);
      setStage({ kind: 'form' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Payment failed ──────────────────────────────────────────────
  if (stage.kind === 'failed') {
    return (
      <section className="bento-card mx-auto max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
            <XCircle size={32} />
          </span>
        </div>
        <h1 className="text-xl font-extrabold text-[#DC2626]">
          Payment Failed
        </h1>
        <p className="mt-2 text-sm text-[#666057]">
          The payment gateway was declined or cancelled. Nothing was charged.
        </p>

        <div className="mt-5 rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-4 text-left">
          <b className="text-xs font-bold text-[#15803D]">
            ✓ ✦ {formatSparks(stage.order.sparksTotal)} Sparks Returned
          </b>
          <p className="mt-1 text-xs text-[#15803D]">
            The Sparks reserved for this order were released back to your wallet. Balance: {formatSparks(wallet.balance)}.
          </p>
        </div>

        {error && <InlineError message={error} className="mt-4" />}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="gold" onClick={() => setStage({ kind: 'form' })}>Try Payment Again</Button>
          <Button variant="secondary" onClick={() => navigate('/cart')}>
            Back to Cart
          </Button>
        </div>
      </section>
    );
  }

  // ── Gateway closed without settling ─────────────────────────────
  if (stage.kind === 'pending') {
    return (
      <section className="bento-card mx-auto max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center text-[#D97706]">
          <Hourglass size={32} className="animate-spin" />
        </div>
        <h1 className="text-xl font-extrabold text-[#191B1D]">
          Payment Pending
        </h1>
        <p className="mt-2 text-sm text-[#666057]">
          Order #{stage.order.id.slice(0, 8)} is awaiting completion. {formatSparks(stage.order.sparksTotal)} Sparks remain reserved.
        </p>

        {error && <InlineError message={error} className="mt-4" />}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="gold"
            onClick={() => setStage({ kind: 'paying', order: stage.order, intent: stage.intent })}
          >
            Resume Payment
          </Button>
          <Button
            variant="ghost"
            disabled={submitting}
            onClick={() => void cancelPending(stage.order)}
          >
            {submitting ? 'Cancelling…' : 'Cancel Order & Release Sparks'}
          </Button>
        </div>
      </section>
    );
  }

  // ── Form + review ──────────────────────────────────────────────
  const payLabel = quote ? `Place Order · ${formatPaise(quote.cashTotalPaise)}` : 'Place Order';

  return (
    <section className="space-y-6">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DFD2] bg-white px-4 py-1.5 text-xs font-bold text-[#666057] shadow-xs hover:text-[#191B1D] hover:bg-[#FAF6EE] transition-all"
      >
        <ArrowLeft size={14} /> Back to Cart
      </Link>

      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-[#9B9489] mb-1">Final Step</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191B1D]">Checkout</h1>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="bento-card p-6 sm:p-8">
          {requiresShipping ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#191B1D]">DELIVERY ADDRESS</h3>
                <button
                  className="text-xs font-bold text-[#D97706] hover:underline"
                  onClick={() => setAddress(DEMO_ADDRESS)}
                >
                  Use demo address
                </button>
              </div>

              {field('fullName', 'Full name')}
              {field('phone', 'Phone')}
              {field('line1', 'House / Street')}
              {field('line2', 'Landmark', { optional: true })}
              <div className="grid grid-cols-2 gap-4">
                {field('city', 'City')}
                {field('state', 'State')}
              </div>
              {field('pincode', 'PIN code')}

              {showErrors && problems.length > 0 && (
                <InlineError message={`Please complete: ${problems.join(', ')}.`} className="mb-4" />
              )}
            </>
          ) : (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-bold text-[#191B1D]">DIGITAL DELIVERY</h3>
              <p className="text-sm text-[#666057]">
                Every item in this order is a Sparks-only digital reward. No physical shipping is required.
              </p>
            </div>
          )}

          <h3 className="mb-3 mt-6 text-sm font-bold text-[#191B1D]">PAYMENT METHOD</h3>
          {quote && quote.cashTotalPaise === 0 ? (
            <div className="rounded-2xl border border-[#86EFAC] bg-[#F0FDF4] p-4">
              <p className="text-sm font-bold text-[#15803D]">✦ 100% Sparks Covered</p>
              <p className="mt-0.5 text-xs text-[#15803D]">
                No cash required — this order settles instantly using your Spark balance.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E6DFD2] bg-[#FAF6EE] p-4">
              <p className="text-sm font-bold text-[#191B1D]">Simulated Payment Gateway</p>
              <p className="mt-0.5 text-xs text-[#8E877B]">
                A safe mock payment gateway will open next where you can simulate success or test failure.
              </p>
            </div>
          )}

          {error && <InlineError message={error} className="mt-4" />}

          <Button
            variant="gold"
            size="lg"
            block
            className="mt-6"
            disabled={submitting || quotePending || !quote || !quote.sufficientBalance}
            onClick={() => void placeOrder()}
          >
            {submitting ? 'Placing Order…' : payLabel}
          </Button>
        </div>

        {/* Right Summary Bento */}
        <aside className="bento-card p-6">
          <h3 className="mb-4 text-sm font-bold text-[#191B1D]">ORDER SUMMARY</h3>

          {quoteError && <InlineError message={quoteError} className="mb-3" />}

          {quote ? (
            <>
              {quote.lines.map((line) => (
                <div key={line.productId} className="mb-3.5 flex justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <b className="block truncate text-xs font-bold text-[#191B1D]">{line.name}</b>
                    <span className="text-[0.7rem] text-[#8E877B]">
                      Qty: {line.qty} {line.isSparksOnly ? ' · Sparks only' : ''}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-xs font-bold text-[#D97706]">
                      ✦ {formatSparks(line.sparksApplied)}
                    </span>
                    <b className="text-xs font-bold text-[#191B1D]">{formatPaise(line.lineCashPaise)}</b>
                  </div>
                </div>
              ))}

              <div className="my-4 h-px bg-[#EFE8DC]" />

              <div className="flex justify-between py-1 text-xs">
                <span className="text-[#666057]">Sparks applied</span>
                <b className="text-[#D97706]">✦ {formatSparks(quote.sparksTotal)}</b>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-[#666057]">Sparks discount</span>
                <b className="text-[#10B981]">−{formatPaise(quote.sparksTotal)}</b>
              </div>
              <div className="mt-3 flex justify-between border-t border-[#E6DFD2] pt-3 text-base">
                <span className="font-bold text-[#191B1D]">Pay Now</span>
                <b className="text-xl font-extrabold text-[#191B1D]">{formatPaise(quote.cashTotalPaise)}</b>
              </div>
              {quote.earnbackSparks > 0 && (
                <div className="mt-2 flex justify-between border-t border-dashed border-[#E6DFD2] pt-2 text-xs">
                  <span className="text-[#666057]">Earn back reward</span>
                  <b className="text-[#10B981]">✦ +{formatSparks(quote.earnbackSparks)} Sparks</b>
                </div>
              )}

              {!quote.sufficientBalance && (
                <InlineError
                  className="mt-3"
                  message={`Balance is ${formatSparks(quote.walletBalance)} Sparks but this order needs ${formatSparks(quote.sparksTotal)}.`}
                />
              )}
            </>
          ) : (
            <p className="text-xs text-[#8E877B]">
              {quotePending ? 'Pricing…' : 'No quote available.'}
            </p>
          )}
        </aside>
      </div>

      {stage.kind === 'paying' && (
        <MockPaymentModal
          intent={stage.intent}
          sparksReserved={stage.order.sparksTotal}
          onSettled={handleSettled}
          onDismiss={() => setStage({ kind: 'pending', order: stage.order, intent: stage.intent })}
        />
      )}
    </section>
  );
};
