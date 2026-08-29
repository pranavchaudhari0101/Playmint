import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CRT-styled modal: dark overlay, vignette + scanlines on the content
 * panel, amber pixel title. All Radix Dialog features (focus trap,
 * escape, aria) come free.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent: React.FC<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { wide?: boolean }
> = ({ className, children, wide, ...props }) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out fixed inset-0 z-50 bg-[#191B1D]/35 backdrop-blur-[3px]" />
    <DialogPrimitive.Content
      className={cn(
        'bento-card data-[state=open]:animate-content-in data-[state=closed]:animate-content-out',
        'fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6',
        wide ? 'max-w-2xl' : 'max-w-md',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute top-4 right-4 rounded-full p-1.5 text-[#968F83] transition-colors hover:bg-[#F3ECE0] hover:text-[#191B1D]"
        aria-label="Close"
      >
        <X size={16} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

export const DialogTitle: React.FC<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
> = ({ className, ...props }) => (
  <DialogPrimitive.Title
    className={cn('text-base font-extrabold tracking-tight text-[#191B1D]', className)}
    {...props}
  />
);

export const DialogDescription: React.FC<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
> = ({ className, ...props }) => (
  <DialogPrimitive.Description
    className={cn('mt-2 text-sm leading-relaxed text-[#666057]', className)}
    {...props}
  />
);
