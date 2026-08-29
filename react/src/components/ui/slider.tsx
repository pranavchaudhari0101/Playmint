import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

/** Amber CRT track slider — the Spark allocation control. */
export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center py-2',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full border border-edge bg-brown">
      <SliderPrimitive.Range className="absolute h-full bg-amber shadow-[0_0_10px_rgba(255,176,0,0.45)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-3.5 rounded-[3px] border-2 border-charcoal bg-amber-bright shadow-[0_0_12px_rgba(255,176,0,0.6)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50"
      aria-label="Sparks to apply"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';
