import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSparks } from '@/lib/money';
import { Button } from '@/components/ui/button';

interface SparkSliderProps {
  value: number;
  max: number;
  /** Eligible cap for display, when it differs from the slidable max. */
  cap?: number;
  step?: number;
  disabled?: boolean;
  onChange(value: number): void;
  ariaLabel?: string;
  className?: string;
}

/**
 * The Spark allocation control in warm luxury bento styling.
 */
export const SparkSlider: React.FC<SparkSliderProps> = ({
  value,
  max,
  cap,
  step = 100,
  disabled,
  onChange,
  ariaLabel = 'Sparks to apply',
  className,
}) => {
  const bounded = Math.min(value, max);

  return (
    <div className={cn(disabled && 'opacity-50', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-[#666057]">APPLY SPARKS</span>
        <span className="font-bold text-sm text-[#191B1D]">
          {formatSparks(bounded)} / <span className="text-[#8E877B]">{formatSparks(cap ?? max)}</span>
        </span>
      </div>

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center py-3"
        value={[bounded]}
        min={0}
        max={max}
        step={step}
        disabled={disabled || max === 0}
        onValueChange={([next]) => onChange(next)}
        aria-label={ariaLabel}
      >
        <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full border border-[#E6DFD2] bg-[#F2EDE2]">
          <SliderPrimitive.Range className="absolute h-full bg-[#FDB827] shadow-[0_0_10px_rgba(253,184,39,0.35)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-6 w-6 rounded-full border-2 border-white bg-[#FDB827] shadow-[0_2px_8px_rgba(253,184,39,0.5)] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]"
          aria-label={ariaLabel}
        />
      </SliderPrimitive.Root>

      <div className="mt-1 flex items-center justify-between text-xs font-medium text-[#8E877B]">
        <span>0</span>
        <span>
          {max < (cap ?? max) ? `${formatSparks(max)} (balance cap)` : `${formatSparks(max)} max`}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onChange(0)}>
          <X size={13} /> No Sparks
        </Button>
        <Button variant="gold" size="sm" disabled={disabled} onClick={() => onChange(max)}>
          <Sparkles size={13} /> Max Sparks
        </Button>
      </div>
    </div>
  );
};
