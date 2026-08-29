import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressTrackProps {
  value: number;
  max: number;
  label?: string;
  rightLabel?: string;
  className?: string;
}

/**
  * Warm gold & emerald rounded capsule progress track.
  */
export const ProgressTrack: React.FC<ProgressTrackProps> = ({
  value,
  max,
  label,
  rightLabel,
  className,
}) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const complete = pct >= 100;

  return (
    <div className={cn('w-full', className)}>
      {(label || rightLabel) && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold text-[#191B1D]">{label}</span>
          <span className="text-xs font-semibold text-[#8E877B]">{rightLabel}</span>
        </div>
      )}
      <div
        className="relative h-3 w-full overflow-hidden rounded-full border border-[#E6DFD2] bg-[#F2EDE2]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            complete
              ? 'bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : 'bg-[#FDB827] shadow-[0_0_12px_rgba(253,184,39,0.4)]',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
