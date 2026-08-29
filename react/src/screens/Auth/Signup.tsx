import React from 'react';
import { SignUp } from '@clerk/react';
import { AuthLayout, authAppearance } from './AuthLayout';

/** Clerk-powered sign-up. */
export const Signup: React.FC = () => (
  <AuthLayout>
    <SignUp
      routing="path"
      path="/signup"
      fallbackRedirectUrl="/"
      signInUrl="/login"
      appearance={authAppearance}
    />
  </AuthLayout>
);
