import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatSparks } from '@/lib/money';

interface SparkCounterProps {
  value: number;
  /** Compact = no icon, tighter (bottom nav). Default = full display. */
  compact?: boolean;
  className?: string;
}

/**
 * Animated odometer for Spark balances in warm gold luxury styling.
 */
export const SparkCounter: React.FC<SparkCounterProps> = ({ value, compact, className }) => {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (from === to) return;

    const controls = animate(from, to, {
      duration: Math.min(1.2, 0.3 + Math.abs(to - from) / 4000),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value]);

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FDB827] text-[0.6rem] font-bold text-[#191B1D]">
          ✦
        </span>
        <span className="font-bold text-xs text-[#191B1D] tabular-nums">
          {formatSparks(display)}
        </span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDB827] text-sm font-bold text-[#191B1D] shadow-sm">
        ✦
      </span>
      <span className="font-extrabold text-2xl text-[#191B1D] tracking-tight tabular-nums">
        {formatSparks(display)}
      </span>
      <span className="rounded-full bg-[#FAF4E6] border border-[#F3E2B8] px-2 py-0.5 text-[0.65rem] font-bold text-[#B45309]">
        SPARKS
      </span>
    </span>
  );
};
