import React from 'react';
import { GameHUD } from './GameHUD';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  showTopBar?: boolean;
  showBottomNav?: boolean;
}

/** Player app frame: Warm luxury pill HUD + bento container + bottom nav. */
export const AppShell: React.FC<AppShellProps> = ({
  children,
  showTopBar = true,
  showBottomNav = true,
}) => (
  <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#FAF7F2]">
    {/* Ambient luxury golden/warm glow */}
    <div className="pointer-events-none fixed -top-24 right-0 h-[500px] w-[500px] rounded-full bg-[#FFE59E]/40 blur-[140px] -z-10" />
    <div className="pointer-events-none fixed top-1/3 -left-20 h-[400px] w-[400px] rounded-full bg-[#F4ECDE]/60 blur-[120px] -z-10" />
    <div className="pointer-events-none fixed bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#FCE8B2]/25 blur-[130px] -z-10" />

    {showTopBar && <GameHUD />}
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 pt-4 pb-28">{children}</main>
    {showBottomNav && <BottomNav />}
  </div>
);
