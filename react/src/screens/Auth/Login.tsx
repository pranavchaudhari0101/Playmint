import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { InlineError } from '@/components/Feedback';

/** Credentials created by backend/scripts/seed.ts. */
const DEMO_ACCOUNTS = [
  { label: '▶ Demo player', email: 'player@playsuper.dev', password: 'Player@12345' },
];

type Mode = 'login' | 'signup';

export const Login: React.FC = () => {
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  async function submit(nextEmail: string, nextPassword: string) {
    setError(null);
    setBusy(true);
    try {
      const authed =
        mode === 'login'
          ? await login(nextEmail, nextPassword)
          : await signup(nextEmail, nextPassword, displayName || undefined);
      navigate(authed.role === 'admin' ? '/' : '/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* ambient warm glow */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-[420px] w-[420px] rounded-full bg-[#FFF2D0] blur-[120px]"
        aria-hidden
      />

      <div className="bento-card relative z-10 w-full max-w-md p-8">
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDB827] font-bold text-[#191C1F] shadow-[0_4px_12px_-2px_rgba(253,184,39,0.5)]">
              ✦
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#191B1D]">Playmint</span>
          </div>
          <h1 className="text-xl font-bold text-[#191B1D]">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#666057]">
            Sparks are earned through play. They cannot be bought or cashed out — only spent on
            eligible rewards.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit(email, password);
          }}
        >
          {mode === 'signup' && (
            <div className="mb-4">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="mb-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />
          </div>

          {error && <InlineError message={error} className="mb-4" />}

          <Button variant="primary" size="lg" block type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-xs font-semibold text-[#968F83] underline-offset-4 transition-colors hover:text-[#666057] hover:underline"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>

        {mode === 'login' && (
          <div className="mt-6 rounded-2xl border border-[#E6DFD2] bg-[#FAF6EE] p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#948E84]">
              Seeded demo accounts
            </div>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    void submit(account.email, account.password);
                  }}
                >
                  {account.label}
                </Button>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
              <Zap size={12} fill="currentColor" />
              Demo player boots with 2,940 Sparks
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
