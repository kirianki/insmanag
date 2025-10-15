'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Sidebar } from '../../components/shared/sidebar'; // We will create this next
import { Header } from '../../components/shared/header';   // And this

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the session is finished loading and there's no user, redirect to login.
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // While the session is loading, show a global loading screen.
  // This prevents a flash of the login page for authenticated users.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-semibold">
        Loading Session...
      </div>
    );
  }

  // If a user is found, render the full dashboard layout.
  if (user) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // If loading is done and there's no user, this will be briefly rendered
  // before the useEffect redirects. Returning null prevents rendering anything.
  return null;
}