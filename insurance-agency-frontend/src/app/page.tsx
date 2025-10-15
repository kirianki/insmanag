'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // If user is logged in, go to the dashboard
        router.replace('/dashboard');
      } else {
        // If user is not logged in, go to the login page
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  // Show a loading state while we determine where to redirect
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-semibold">Loading...</p>
    </div>
  );
}