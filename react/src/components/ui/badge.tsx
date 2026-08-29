import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold leading-none shadow-sm transition-colors',
  {
    variants: {
      variant: {
        default: 'border-[#E6DFD2] bg-[#FAF6EE] text-[#666057]',
        amber: 'border-[#FCD34D] bg-[#FFFBEB] text-[#D97706]',
        gold: 'border-[#F59E0B] bg-[#FEF3C7] text-[#B45309]',
        phosphor: 'border-[#86EFAC] bg-[#F0FDF4] text-[#15803D]',
        rust: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]',
        cream: 'border-[#E6DFD2] bg-white text-[#191B1D]',
        obsidian: 'border-[#2C3035] bg-[#191C1F] text-white',
        outline: 'border-[#E6DFD2] bg-transparent text-[#968F83]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

/** Order status → badge variant + label mapping used across player and admin. */
export const ORDER_STATUS_META: Record<
  string,
  { label: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  PENDING_PAYMENT: { label: 'PENDING', variant: 'amber' },
  PAID: { label: 'PAID', variant: 'phosphor' },
  FULFILLED: { label: 'FULFILLED', variant: 'phosphor' },
  FAILED: { label: 'FAILED', variant: 'rust' },
  CANCELLED: { label: 'CANCELLED', variant: 'outline' },
};

export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = ORDER_STATUS_META[status] ?? { label: status, variant: 'default' as const };
  return (
    <Badge variant={meta.variant} className="text-[0.65rem] font-bold tracking-wider">
      {meta.label}
    </Badge>
  );
};
