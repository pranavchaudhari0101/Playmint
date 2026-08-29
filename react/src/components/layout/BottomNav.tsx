import React from 'react';
import { NavLink } from 'react-router-dom';
import { Gamepad2, Gift, Zap, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', label: 'Play', icon: Gamepad2, end: true },
  { to: '/store', label: 'Rewards', icon: Gift, end: false },
  { to: '/wallet', label: 'Wallet', icon: Zap, end: false },
  { to: '/orders', label: 'Orders', icon: Package, end: false },
];

/** Modern floating capsule dock for mobile navigation. */
export const BottomNav: React.FC = () => (
  <nav className="fixed inset-x-0 bottom-4 z-40 md:hidden flex justify-center px-4 pointer-events-none">
    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#E6DFD2] bg-white/90 p-1.5 shadow-[0_12px_32px_-8px_rgba(40,30,20,0.12)] backdrop-blur-lg">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 transition-all',
              isActive
                ? 'bg-[#1C1F22] text-[#FDB827] shadow-sm font-semibold'
                : 'text-[#8E867A] hover:bg-[#F2ECE0] hover:text-[#191B1D]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[0.6rem] font-medium tracking-tight">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);
