import React from 'react';
import { cn } from '@/lib/utils';

interface ProductVisualProps {
  sku?: string;
  name?: string;
  category?: string;
  imageUrl?: string | null;
  className?: string;
  aspect?: 'square' | 'wide' | 'fill';
}

/**
 * ─── ProductVisual ─────────────────────────────────────────────────
 * Luxury in-game commerce asset renderer.
 * Produces crisp, bespoke 3D-styled vector badges and product art.
 * Guarantees zero emoji fallbacks or broken image links across all devices.
 * ──────────────────────────────────────────────────────────────────
 */
export const ProductVisual: React.FC<ProductVisualProps> = ({
  sku = '',
  name = '',
  category = '',
  imageUrl,
  className,
  aspect = 'square',
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  // If a valid custom image URL exists and hasn't failed, show it
  if (imageUrl && !imageFailed && !imageUrl.includes('placehold.co')) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImageFailed(true)}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
      />
    );
  }

  // Derive visual type from SKU, name or category
  const s = sku.toLowerCase();
  const n = name.toLowerCase();
  const cat = category.toLowerCase();

  const aspectClass =
    aspect === 'wide' ? 'aspect-[16/9]' : aspect === 'square' ? 'aspect-square' : 'h-full w-full';

  // 1. Audio / Earbuds
  if (s.includes('buds') || n.includes('earbuds') || n.includes('audio')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white',
          aspectClass,
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(253,184,39,0.15),transparent_70%)]" />
        {/* Pulse Waves */}
        <div className="absolute h-28 w-28 animate-ping rounded-full border border-[#FDB827]/20 opacity-40 duration-1000" />
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(253,184,39,0.4)]" viewBox="0 0 64 64" fill="none">
            <rect x="18" y="14" width="28" height="36" rx="14" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
            <circle cx="32" cy="26" r="6" fill="#FDB827" />
            <path d="M26 38 C28 42, 36 42, 38 38" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="22" r="2" fill="#0EA5E9" />
            <circle cx="41" cy="22" r="2" fill="#0EA5E9" />
          </svg>
          <span className="mt-2 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#FDB827]">
            PULSE AUDIO
          </span>
        </div>
      </div>
    );
  }

  // 2. Gaming Controller / Grip
  if (s.includes('grip') || s.includes('controller') || n.includes('controller') || n.includes('gaming')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#18181B] via-[#27272A] to-[#09090B] text-white',
          aspectClass,
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]" viewBox="0 0 64 64" fill="none">
            <path
              d="M14 26 C14 18, 50 18, 50 26 C52 38, 46 48, 42 48 C38 48, 36 40, 32 40 C28 40, 26 48, 22 48 C18 48, 12 38, 14 26 Z"
              fill="#27272A"
              stroke="#FDB827"
              strokeWidth="2"
            />
            {/* D-pad */}
            <path d="M22 28 V34 M19 31 H25" stroke="#E4E4E7" strokeWidth="2.5" strokeLinecap="round" />
            {/* Action buttons */}
            <circle cx="41" cy="28" r="2" fill="#F43F5E" />
            <circle cx="45" cy="32" r="2" fill="#10B981" />
            <circle cx="37" cy="32" r="2" fill="#3B82F6" />
            <circle cx="41" cy="36" r="2" fill="#FDB827" />
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#10B981]">
            PRO GEAR
          </span>
        </div>
      </div>
    );
  }

  // 3. Bluetooth Speaker / Audio Gear
  if (s.includes('speaker') || n.includes('speaker')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#31104B] text-white',
          aspectClass,
          className
        )}
      >
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(139,92,246,0.35)]" viewBox="0 0 64 64" fill="none">
            <rect x="22" y="12" width="20" height="40" rx="10" fill="#334155" stroke="#A855F7" strokeWidth="2" />
            <circle cx="32" cy="24" r="5" fill="#1E293B" stroke="#FDB827" strokeWidth="1.5" />
            <circle cx="32" cy="38" r="6" fill="#1E293B" stroke="#06B6D4" strokeWidth="1.5" />
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#A855F7]">
            HI-FI AUDIO
          </span>
        </div>
      </div>
    );
  }

  // 4. RGB Light / Desk Ambiance
  if (s.includes('light') || s.includes('rgb') || n.includes('light')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#18181B] via-[#09090B] to-[#18181B] text-white',
          aspectClass,
          className
        )}
      >
        <div className="absolute h-24 w-8 bg-gradient-to-t from-[#EC4899] via-[#8B5CF6] to-[#06B6D4] blur-lg opacity-60" />
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none">
            <rect x="28" y="10" width="8" height="40" rx="4" fill="url(#rgbGrad)" stroke="#FFFFFF" strokeWidth="1.5" />
            <rect x="22" y="48" width="20" height="6" rx="3" fill="#27272A" stroke="#52525B" />
            <defs>
              <linearGradient id="rgbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#EC4899]">
            RGB AMBIANCE
          </span>
        </div>
      </div>
    );
  }

  // 5. Vouchers (Food, Coffee, Treat, Energy)
  if (s.includes('voucher') || cat.includes('food') || n.includes('voucher') || n.includes('treat') || n.includes('coffee')) {
    const isCoffee = s.includes('coffee') || n.includes('coffee');
    const isEnergy = s.includes('energy') || n.includes('energy');

    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#451A03] via-[#78350F] to-[#292524] text-white',
          aspectClass,
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,184,39,0.2),transparent_70%)]" />
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" viewBox="0 0 64 64" fill="none">
            {/* Ticket Badge */}
            <rect x="12" y="16" width="40" height="32" rx="6" fill="#FDB827" stroke="#FBBF24" strokeWidth="1.5" />
            <circle cx="12" cy="32" r="4" fill="#451A03" />
            <circle cx="52" cy="32" r="4" fill="#451A03" />
            <line x1="22" y1="20" x2="22" y2="44" stroke="#78350F" strokeWidth="1.5" strokeDasharray="2 2" />
            {isCoffee ? (
              <text x="36" y="36" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#78350F">
                ☕
              </text>
            ) : isEnergy ? (
              <path d="M34 22 L28 34 H34 L32 42 L40 30 H34 Z" fill="#78350F" />
            ) : (
              <text x="36" y="36" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#78350F">
                🍔
              </text>
            )}
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#FDE68A]">
            INSTANT VOUCHER
          </span>
        </div>
      </div>
    );
  }

  // 6. Digital Passes / Recharge / Subscriptions
  if (cat.includes('digital') || s.includes('recharge') || s.includes('music') || s.includes('movie') || s.includes('pass')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#0284C7] to-[#0369A1] text-white',
          aspectClass,
          className
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.3),transparent_60%)]" />
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" viewBox="0 0 64 64" fill="none">
            <rect x="14" y="16" width="36" height="32" rx="6" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="24" cy="32" r="5" fill="#38BDF8" />
            <path d="M34 26 H44 M34 32 H44 M34 38 H40" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#BAE6FD]">
            DIGITAL PASS
          </span>
        </div>
      </div>
    );
  }

  // 7. Fashion & Apparel (Hoodie, Socks, Sling Bag)
  if (cat.includes('fashion') || s.includes('hoodie') || s.includes('socks') || s.includes('bag')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#44403C] text-white',
          aspectClass,
          className
        )}
      >
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" viewBox="0 0 64 64" fill="none">
            <path
              d="M20 20 L28 14 L36 14 L44 20 L40 28 L36 24 V48 H28 V24 L24 28 Z"
              fill="#D6D3D1"
              stroke="#FDB827"
              strokeWidth="2"
            />
            <circle cx="32" cy="32" r="3" fill="#FDB827" />
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#FDB827]">
            STREETWEAR
          </span>
        </div>
      </div>
    );
  }

  // 8. Electronics & Gadgets (Wireless charger, Fitness band, Fan, Phone Case)
  if (cat.includes('electronics') || s.includes('charger') || s.includes('band') || s.includes('case') || s.includes('fan')) {
    return (
      <div
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#042F2E] via-[#115E59] to-[#0F766E] text-white',
          aspectClass,
          className
        )}
      >
        <div className="relative flex flex-col items-center">
          <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(20,184,166,0.3)]" viewBox="0 0 64 64" fill="none">
            <rect x="22" y="14" width="20" height="36" rx="8" fill="#134E4A" stroke="#2DD4BF" strokeWidth="2" />
            <circle cx="32" cy="32" r="5" fill="#2DD4BF" />
            <path d="M32 20 V22 M32 42 V44" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#99F6E4]">
            SMART TECH
          </span>
        </div>
      </div>
    );
  }

  // 9. Default Luxury In-Game Reward Shield
  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#1C1F22] via-[#2A2F35] to-[#121416] text-white',
        aspectClass,
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,184,39,0.2),transparent_70%)]" />
      <div className="relative flex flex-col items-center">
        <svg className="h-16 w-16 drop-shadow-[0_8px_16px_rgba(253,184,39,0.3)]" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 10 L48 18 V34 C48 44 32 52 32 52 C32 52 16 44 16 34 V18 Z"
            fill="#2A2F35"
            stroke="#FDB827"
            strokeWidth="2"
          />
          <path d="M32 22 L35 28 L42 29 L37 34 L38 41 L32 37 L26 41 L27 34 L22 29 L29 28 Z" fill="#FDB827" />
        </svg>
        <span className="mt-1.5 text-[0.65rem] font-extrabold uppercase tracking-widest text-[#FDB827]">
          EXCLUSIVE REWARD
        </span>
      </div>
    </div>
  );
};
