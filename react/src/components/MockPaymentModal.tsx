import React, { useState } from 'react';
import { CreditCard, ReceiptText } from 'lucide-react';
import { api } from '@/api/endpoints';
import { errorMessage } from '@/lib/useApi';
import { formatPaise, formatSparks } from '@/lib/money';
import type { PaymentIntent, SettleResult } from '@/api/types';
import { InlineError } from './Feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MockPaymentModalProps {
  intent: PaymentIntent;
  sparksReserved: number;
  /** Called after the gateway settles, with the server's order + wallet. */
  onSettled(result: SettleResult, outcome: 'SUCCESS' | 'FAILURE'): void;
  onDismiss(): void;
}

/**
 * ─── Simulated payment gateway ────────────────────────────────────
 * Stands in for the hosted checkout page as a warm bento receipt card.
 * Both buttons drive the real endpoint (POST /api/payments/mock/:intentId),
 * so the server performs the actual state transition:
 *
 *   SUCCESS → commit Sparks, credit earn-back, decrement stock, PAID
 *   FAILURE → release reserved Sparks back to the wallet, FAILED
 *
 * The Sparks are ALREADY debited at this point — the order reserved them
 * when it was created. That is what makes the failure path worth showing.
 * ──────────────────────────────────────────────────────────────────
 */
export const MockPaymentModal: React.FC<MockPaymentModalProps> = ({
  intent,
  sparksReserved,
  onSettled,
  onDismiss,
}) => {
  const [busy, setBusy] = useState<'SUCCESS' | 'FAILURE' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMock = intent.provider === 'mock';

  async function settle(outcome: 'SUCCESS' | 'FAILURE') {
    setError(null);
    setBusy(outcome);
    try {
      const result = await api.payments.confirmMock(intent.intentId, outcome);
      onSettled(result, outcome);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onDismiss()}>
      <DialogContent aria-describedby="pay-desc">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDB827] text-[#191C1F] shadow-sm">
            <ReceiptText size={17} />
          </span>
          <DialogTitle>Payment Gateway</DialogTitle>
        </div>
        <DialogDescription id="pay-desc">
          Simulated checkout session. The server holds the reserved Sparks until you settle.
        </DialogDescription>

        {/* Receipt-style gateway summary */}
        <div className="mt-5 rounded-2xl border border-[#E6DFD2] bg-[#FAF6EE] p-4">
          <div className="flex items-baseline justify-between border-b border-dashed border-[#DDD3C3] pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#948E84]">
              Amount due
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-[#191B1D]">
              {formatPaise(intent.amountPaise)}
            </span>
          </div>
          <div className="space-y-2 pt-3 text-xs text-[#666057]">
            <div className="flex justify-between gap-3">
              <span>Provider</span>
              <b className="text-[#191B1D]">{intent.provider}</b>
            </div>
            <div className="flex justify-between gap-3">
              <span>Intent</span>
              <code className="min-w-0 truncate font-mono text-[0.7rem] text-[#666057]">
                {intent.intentId}
              </code>
            </div>
            <div className="flex justify-between gap-3">
              <span>Sparks reserved</span>
              <b className="text-[#B45309]">⚡ {formatSparks(sparksReserved)}</b>
            </div>
          </div>
        </div>

        {sparksReserved > 0 && (
          <p className="mt-3 text-center text-xs font-semibold text-[#059669]">
            ⚡ {formatSparks(sparksReserved)} Sparks are already held against this order — choosing
            Fail returns them to your wallet.
          </p>
        )}

        {error && <InlineError message={error} className="mt-3" />}

        {!isMock ? (
          <>
            <InlineError
              className="mt-4"
              message={`This order was created with the "${intent.provider}" provider, which uses a real hosted checkout and webhook. The simulated buttons only work when PAYMENT_PROVIDER=mock.`}
            />
            <Button variant="secondary" block className="mt-3" onClick={onDismiss}>
              Close
            </Button>
          </>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                variant="gold"
                size="lg"
                disabled={busy !== null}
                onClick={() => void settle('SUCCESS')}
              >
                <CreditCard size={16} />
                {busy === 'SUCCESS' ? 'Processing…' : 'Simulate successful payment'}
              </Button>
              <Button
                variant="danger"
                size="lg"
                disabled={busy !== null}
                onClick={() => void settle('FAILURE')}
              >
                {busy === 'FAILURE' ? 'Processing…' : 'Simulate failed payment'}
              </Button>
            </div>

            <button
              className="mt-3 w-full text-center text-xs font-semibold text-[#968F83] underline-offset-4 transition-colors hover:text-[#666057] hover:underline"
              disabled={busy !== null}
              onClick={onDismiss}
            >
              Leave order pending
            </button>
            <p className="mt-2 text-center text-xs text-[#968F83]">
              Leaving it pending keeps the Sparks reserved — cancel it from order history to get
              them back.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
