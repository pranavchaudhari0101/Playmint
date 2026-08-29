import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

/** Themed sonner toaster — mount once near the app root. */
export const Toaster: React.FC = () => (
  <SonnerToaster
    theme="dark"
    position="top-center"
    toastOptions={{
      style: {
        background: '#221b12',
        border: '1px solid #40342a',
        color: '#f2e8d5',
        borderRadius: '10px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.85rem',
      },
    }}
  />
);

export { toast };
