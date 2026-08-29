import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/react';

/** Blocks a route until a Clerk session exists, remembering where the user was headed. */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  if (!isLoaded) return <FullPageSpinner />;
  if (!isSignedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};

export const FullPageSpinner: React.FC = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4">
    <div className="flex gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#FDB827]"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
    <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-[#948E84]">
      Loading
    </p>
  </div>
);
