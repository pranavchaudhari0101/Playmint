import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList: React.FC<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
> = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex items-center gap-1 rounded-lg border border-edge bg-charcoal-deep p-1',
      className,
    )}
    {...props}
  />
);

export const TabsTrigger: React.FC<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
> = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'rounded-md px-3 py-1.5 text-xs font-semibold text-cream-dim transition-colors',
      'hover:text-cream data-[state=active]:bg-amber data-[state=active]:text-charcoal',
      className,
    )}
    {...props}
  />
);

export const TabsContent: React.FC<
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
> = ({ className, ...props }) => (
  <TabsPrimitive.Content className={cn('mt-4', className)} {...props} />
);
