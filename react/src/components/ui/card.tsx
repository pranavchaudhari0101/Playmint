import React from 'react';
import { cn } from '@/lib/utils';

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { glow?: boolean; dark?: boolean }
> = ({ className, glow, dark, ...props }) => (
  <div
    className={cn(
      dark
        ? 'bento-card-dark p-6'
        : 'bento-card p-6',
      glow && 'box-glow-amber',
      className,
    )}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />;

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn('text-lg font-bold text-[#191B1D] tracking-tight leading-snug', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn('text-sm text-[#666057]', className)} {...props} />;

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('pt-2', className)} {...props} />;
