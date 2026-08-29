import React from 'react';

/** Shared Clerk appearance — dark ink primary with soft rounded corners, matching the Playmint HUD. */
export const authAppearance = {
  variables: {
    colorPrimary: '#1C1F22',
    borderRadius: '0.9rem',
  },
};

/** Branding frame for the Clerk-powered auth screens (ambient glow + logo). */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
    {/* ambient warm glow */}
    <div
      className="pointer-events-none absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-[#FFF2D0] blur-[120px]"
      aria-hidden
    />

    <div className="relative z-10 flex w-full max-w-md flex-col items-center">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDB827] font-bold text-[#191C1F] shadow-[0_4px_12px_-2px_rgba(253,184,39,0.5)]">
            ✦
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[#191B1D]">Playmint</span>
        </div>
        <p className="text-sm leading-relaxed text-[#666057]">
          Sparks are earned through play. They cannot be bought or cashed out — only spent on
          eligible rewards.
        </p>
      </div>

      {children}
    </div>
  </div>
);
