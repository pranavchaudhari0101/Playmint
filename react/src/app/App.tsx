import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/RouteGuards';
import { Toaster } from '@/components/ui/toast';
import { Login } from '@/screens/Auth/Login';
import { GameHome } from '@/screens/GameHome';
import { EarnMoment } from '@/screens/EarnMoment';
import { StoreHome } from '@/screens/StoreHome';
import { CategoryScreen } from '@/screens/Category';
import { ProductDetail } from '@/screens/ProductDetail';
import { CartScreen } from '@/screens/Cart';
import { Checkout } from '@/screens/Checkout';
import { Success } from '@/screens/Success';
import { Wallet } from '@/screens/Wallet';
import { Orders } from '@/screens/Orders';
import { GoalScreen } from '@/screens/Goal';
import { Play } from '@/screens/Play';

/** Wraps a player route in the shell (HUD + bottom nav) behind auth. */
const Player: React.FC<{ children: React.ReactNode; chrome?: boolean }> = ({
  children,
  chrome = true,
}) => (
  <ProtectedRoute>
    <AppShell showTopBar={chrome} showBottomNav={chrome}>
      {children}
    </AppShell>
  </ProtectedRoute>
);

export const App: React.FC = () => (
  <>
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Player app ────────────────────────────────────────────── */}
      <Route path="/" element={<Player><GameHome /></Player>} />
      <Route path="/play" element={<Play />} />
      <Route path="/earn" element={<Player chrome={false}><EarnMoment /></Player>} />
      <Route path="/store" element={<Player><StoreHome /></Player>} />
      <Route path="/store/:slug" element={<Player><CategoryScreen /></Player>} />
      <Route path="/product/:id" element={<Player><ProductDetail /></Player>} />
      <Route path="/cart" element={<Player><CartScreen /></Player>} />
      <Route path="/checkout" element={<Player chrome={false}><Checkout /></Player>} />
      <Route path="/orders/:id/success" element={<Player><Success /></Player>} />
      <Route path="/orders" element={<Player><Orders /></Player>} />
      <Route path="/wallet" element={<Player><Wallet /></Player>} />
      <Route path="/goal" element={<Player><GoalScreen /></Player>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster />
  </>
);
