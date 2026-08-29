import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="flex min-h-50 flex-col items-center justify-center gap-4 py-20">
    <div className="flex gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FDB827]"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
    <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-[#948E84]">
      {label}
    </p>
  </div>
);

export const ErrorPanel: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="bento-card mx-auto max-w-md border-[#FCA5A5]/60 bg-[#FEF7F7] p-6 text-center"
    role="alert"
  >
    <AlertTriangle className="mx-auto mb-3 text-[#EF4444]" size={28} />
    <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[#B91C1C]">
      Something went wrong
    </p>
    <p className="mb-4 text-sm text-[#666057]">{message}</p>
    {onRetry && (
      <button
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DFD2] bg-white px-4 py-2 text-xs font-semibold text-[#191B1D] shadow-sm transition-colors hover:bg-[#F9F5EE]"
        onClick={onRetry}
      >
        <RefreshCw size={13} /> Retry
      </button>
    )}
  </div>
);

export const InlineError: React.FC<{ message: string; className?: string }> = ({
  message,
  className,
}) => (
  <div
    className={cn(
      'flex items-start gap-2 rounded-2xl border border-[#FCA5A5]/60 bg-[#FEF2F2] px-3.5 py-2.5 text-[0.8rem] font-medium text-[#B91C1C]',
      className,
    )}
    role="alert"
  >
    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
    <span>{message}</span>
  </div>
);

/** Formats an ISO timestamp for the ledger and order lists. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
