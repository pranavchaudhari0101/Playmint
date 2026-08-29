import React from 'react';
import { SignIn } from '@clerk/react';
import { AuthLayout, authAppearance } from './AuthLayout';

/** Clerk-powered sign-in — the prebuilt card handles email, social, and MFA flows. */
export const Login: React.FC = () => (
  <AuthLayout>
    <SignIn
      routing="path"
      path="/login"
      fallbackRedirectUrl="/"
      signUpUrl="/signup"
      appearance={authAppearance}
    />
  </AuthLayout>
);
