'use client'; // This layout must be a client component to use providers

import React from 'react'; // Import React to use its hooks
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../contexts/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const inter = Inter({ subsets: ['latin'] });

// We cannot export metadata from a client component.
// Metadata should be moved to specific page.tsx files or child layouts if needed.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // **THE FIX:** Create the QueryClient instance inside a useState hook.
  // This ensures the client is only created once for the lifetime of the component,
  // preventing it from being re-created on every render.
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}