import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium cursor-pointer select-none rounded-full transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDB827] active:scale-[0.98] whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:
          'bg-[#191C1F] text-white font-semibold shadow-[0_4px_14px_-2px_rgba(25,28,31,0.25)] hover:bg-[#2C3137] hover:shadow-[0_6px_20px_-2px_rgba(25,28,31,0.35)]',
        gold:
          'bg-[#FDB827] text-[#191C1F] font-bold shadow-[0_4px_14px_-2px_rgba(253,184,39,0.4)] hover:bg-[#FFC444] hover:shadow-[0_6px_20px_-2px_rgba(253,184,39,0.5)]',
        secondary:
          'bg-white text-[#191B1D] border border-[#E6DFD2] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-[#F9F5EE] hover:border-[#DDD3C3]',
        ghost:
          'bg-transparent text-[#666057] hover:text-[#191B1D] hover:bg-[#F3ECE0]/70',
        danger:
          'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]/60 hover:bg-[#DC2626] hover:text-white hover:border-[#DC2626]',
        pixel:
          'font-semibold text-xs tracking-wide bg-[#FDB827] text-[#191C1F] px-4 py-2.5 rounded-full shadow-sm hover:bg-[#FFC444]',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-9 w-9 p-0 rounded-full',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
