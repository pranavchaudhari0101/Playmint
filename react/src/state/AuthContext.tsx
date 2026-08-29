import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { onUnauthorized, setToken, getToken } from '../api/client';
import type { PublicUser, WalletState } from '../api/types';

/**
 * Holds the session (user + JWT) and the wallet, which is the one piece of
 * server state nearly every screen needs. Wallet updates flow through here
 * so the top bar, slider bounds and success screens never disagree.
 */

interface AuthContextValue {
  user: PublicUser | null;
  wallet: WalletState;
  /** True until the initial /auth/me probe settles. */
  loading: boolean;
  isAdmin: boolean;
  login(email: string, password: string): Promise<PublicUser>;
  signup(email: string, password: string, displayName?: string): Promise<PublicUser>;
  logout(): void;
  refreshWallet(): Promise<void>;
  /** Applies a wallet the server already returned, avoiding a refetch. */
  setWallet(wallet: WalletState): void;
}

const EMPTY_WALLET: WalletState = { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [wallet, setWalletState] = useState<WalletState>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);

  // Restore the session from a stored token on first mount.
  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setLoading(false);
      return;
    }

    api.auth
      .me()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        setWalletState(result.wallet);
      })
      .catch(() => {
        // Expired or invalid token — client.ts has already cleared it.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 from any call drops the session.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setWalletState(EMPTY_WALLET);
      }),
    [],
  );

  const refreshWallet = useCallback(async () => {
    const next = await api.wallet.get();
    setWalletState(next);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setToken(result.token);
    setUser(result.user);
    // login returns only the balance; fetch the full wallet for lifetime totals.
    setWalletState({ ...EMPTY_WALLET, balance: result.walletBalance });
    void api.wallet.get().then(setWalletState).catch(() => undefined);
    return result.user;
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const result = await api.auth.signup(email, password, displayName);
    setToken(result.token);
    setUser(result.user);
    setWalletState({
      balance: result.walletBalance,
      lifetimeEarned: result.walletBalance,
      lifetimeSpent: 0,
    });
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWalletState(EMPTY_WALLET);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      wallet,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      signup,
      logout,
      refreshWallet,
      setWallet: setWalletState,
    }),
    [user, wallet, loading, login, signup, logout, refreshWallet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
