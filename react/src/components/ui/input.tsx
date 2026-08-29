import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-2xl border bg-white px-4 text-sm text-[#191B1D] placeholder:text-[#9B9489]',
      'shadow-sm transition-all focus:outline-none focus:ring-2',
      invalid
        ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20'
        : 'border-[#E6DFD2] focus:border-[#FDB827] focus:ring-[#FDB827]/25',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-2xl border border-[#E6DFD2] bg-white px-4 py-3 text-sm text-[#191B1D] placeholder:text-[#9B9489]',
      'shadow-sm transition-all focus:border-[#FDB827] focus:outline-none focus:ring-2 focus:ring-[#FDB827]/25',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label
    ref={ref}
    className={cn('mb-1.5 block text-xs font-bold text-[#666057]', className)}
    {...props}
  />
));
Label.displayName = 'Label';

/** Form row: label + control + optional error line. */
export const Field: React.FC<{
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, error, hint, className, children }) => (
  <div className={cn('mb-4', className)}>
    <Label>{label}</Label>
    {children}
    {hint && !error && <p className="mt-1.5 text-[0.75rem] text-[#9B9489]">{hint}</p>}
    {error && (
      <p className="mt-1.5 text-[0.75rem] font-medium text-[#EF4444]" role="alert">
        {error}
      </p>
    )}
  </div>
);
