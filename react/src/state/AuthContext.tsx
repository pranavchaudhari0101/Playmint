import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/react';
import { api } from '../api/endpoints';
import type { PublicUser, WalletState } from '../api/types';

/**
 * Session + wallet context. Identity comes from Clerk (useUser); the wallet
 * is the one piece of server state nearly every screen needs. Wallet updates
 * flow through here so the top bar, slider bounds and success screens never
 * disagree.
 */

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

interface AuthContextValue {
  user: PublicUser | null;
  wallet: WalletState;
  /** True until Clerk settles the session state. */
  loading: boolean;
  isAdmin: boolean;
  refreshWallet(): Promise<void>;
  /** Applies a wallet the server already returned, avoiding a refetch. */
  setWallet(wallet: WalletState): void;
}

const EMPTY_WALLET: WalletState = { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };

const AuthContext = createContext<AuthContextValue | null>(null);

function toPublicUser(clerkUser: ClerkUser): PublicUser {
  const role =
    (clerkUser.publicMetadata as { role?: unknown }).role === 'admin' ? 'admin' : 'user';
  return {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    role,
    displayName: clerkUser.fullName ?? clerkUser.username ?? null,
    createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : '',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [wallet, setWalletState] = useState<WalletState>(EMPTY_WALLET);

  const user = useMemo(() => (clerkUser ? toPublicUser(clerkUser) : null), [clerkUser]);

  // Pull the wallet whenever a Clerk session appears; drop it on sign-out.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setWalletState(EMPTY_WALLET);
      return;
    }
    let cancelled = false;
    api.wallet
      .get()
      .then((next) => {
        if (!cancelled) setWalletState(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const refreshWallet = useCallback(async () => {
    setWalletState(await api.wallet.get());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      wallet,
      loading: !isLoaded,
      isAdmin: user?.role === 'admin',
      refreshWallet,
      setWallet: setWalletState,
    }),
    [user, wallet, isLoaded, refreshWallet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
