import React from 'react';
import { cn } from '@/lib/utils';

interface TerminalPanelProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A dark obsidian "console" accent card — the one deliberate high-contrast
 * element inside the warm bento UI (mirrors the DarkTaskCard aesthetic).
 * Kept for dev tooling: the developer drawer and gateway internals.
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({ title, className, children }) => (
  <div className={cn('bento-card-dark p-4 font-terminal', className)}>
    {title && (
      <div className="mb-2 border-b border-white/10 pb-2 text-base tracking-wider text-white/50">
        {title}
      </div>
    )}
    <div className="relative z-10 text-[1.02rem] leading-relaxed text-[#34D399]">{children}</div>
  </div>
);

export const TerminalLine: React.FC<{
  prompt?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ prompt = '>', className, children }) => (
  <div className={cn('flex gap-2', className)}>
    {prompt !== '' && <span className="shrink-0 text-white/40">{prompt}</span>}
    <span className="min-w-0 flex-1 break-words">{children}</span>
  </div>
);

/** Blinking block cursor — end of a session feed. */
export const TerminalCursor: React.FC = () => (
  <span
    className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#34D399]"
    aria-hidden
  />
);
