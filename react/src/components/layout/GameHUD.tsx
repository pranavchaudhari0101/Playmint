import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  ShieldCheck,
  ShoppingCart,
  TerminalSquare,
} from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { SparkCounter } from '@/components/system/SparkCounter';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Play', end: true },
  { to: '/store', label: 'Rewards', end: false },
  { to: '/wallet', label: 'Wallet', end: false },
  { to: '/orders', label: 'Orders', end: false },
];

/**
 * Luxury Floating Capsule HUD Top Bar (Crextio Aesthetic)
 * Rounded pill badge logo · Center segmented pill menu · Right action capsules.
 */
export const GameHUD: React.FC = () => {
  const { wallet, user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isCurrentActive = (to: string, end: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sticky top-3 z-40 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
      <div className="flex items-center justify-between gap-3">
        {/* ── Left: Brand Capsule ─────────────────────────────────────── */}
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-full border border-[#E7DFD2] bg-white/90 px-4 py-2 shadow-[0_4px_16px_-4px_rgba(40,30,20,0.06)] backdrop-blur-md transition-transform hover:scale-[1.02]"
          title="SPARKS home"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FDB827] text-xs font-bold text-[#191B1D] shadow-sm">
            ✦
          </span>
          <span className="font-bold tracking-tight text-[#191B1D] text-sm">
            Sparks
          </span>
        </Link>

        {/* ── Center: Segmented Capsule Menu ─────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-[#E7DFD2] bg-white/85 p-1.5 shadow-[0_4px_16px_-4px_rgba(40,30,20,0.06)] backdrop-blur-md">
          {NAV_ITEMS.map(({ to, label, end }) => {
            const active = isCurrentActive(to, end);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200',
                  active
                    ? 'bg-[#1C1F22] text-white shadow-sm font-semibold'
                    : 'text-[#6C665E] hover:bg-[#F4ECE0] hover:text-[#191B1D]'
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Action Pills ─────────────────────────────────────── */}
        <div className="flex items-center gap-2">


          {/* Cart pill */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E7DFD2] bg-white/90 text-[#6C665E] shadow-sm hover:bg-[#F2ECE0] hover:text-[#191B1D] transition-colors"
            onClick={() => navigate('/cart')}
            aria-label={`Cart, ${itemCount} items`}
          >
            <ShoppingCart size={16} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FDB827] px-1 text-[0.6rem] font-bold text-[#191B1D] shadow-sm">
                {itemCount}
              </span>
            )}
          </button>

          {/* Spark Balance Capsule */}
          <button
            className="flex items-center gap-1.5 rounded-full border border-[#E7DFD2] bg-white/90 px-3.5 py-1.5 shadow-sm hover:border-[#FDB827] hover:bg-[#FFFDF7] transition-all"
            onClick={() => navigate('/wallet')}
            title={`Balance: ${wallet.balance} Sparks — Open wallet`}
          >
            <SparkCounter value={wallet.balance} compact />
          </button>

          {/* User profile avatar / logout */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#E7DFD2] bg-white/90 p-1 shadow-sm">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1C1F22] text-[0.7rem] font-bold text-[#FDB827]"
              title={user?.displayName || user?.email || 'Player'}
            >
              {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'P'}
            </div>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#9B9489] hover:bg-[#FEE2E2] hover:text-[#EF4444] transition-colors"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
