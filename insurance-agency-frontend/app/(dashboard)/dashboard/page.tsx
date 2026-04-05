'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { getDashboardAnalytics } from '@/services/analyticsService';

import { DashboardHeader } from './components/DashboardHeader';
import { KpiCards } from './components/KpiCards'; // Assuming this component exists
import { RecentActivity } from './components/RecentActivity';
import { ActionableInsights } from './components/ActionableInsights';
import { PerformanceCharts } from './components/PerformanceCharts';
import { TopPerformers } from './components/TopPerformers';
import { ThresholdProgress } from './components/ThresholdProgress';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const queryParams = {
    date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  };

  const { data: analyticsData, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardAnalytics', user?.id, queryParams],
    queryFn: () => getDashboardAnalytics(queryParams).then(res => res.data),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Show loading while auth is initializing or analytics are loading
  if (authLoading || isLoading) {
    return <DashboardSkeleton />;
  }

  // If not authenticated, don't render (redirect is happening)
  if (!isAuthenticated || !user) {
    return null;
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load dashboard data: {error?.message || 'Unknown error'}
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="p-8 text-center">No analytics data available.</div>;
  }

  const { scope, kpis, performance_breakdowns, top_performers, recent_activity, actionable_insights } = analyticsData;

  // Determine if the user has manager/admin level data
  const isManagerOrAdmin = !!performance_breakdowns;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-[#f8fafc]/50 min-h-screen">
      <DashboardHeader
        scope={scope}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <div className="space-y-6">
        {/* The KpiCards component should handle its own responsive grid, e.g., grid-cols-2 md:grid-cols-4 */}
        <KpiCards kpis={kpis} />

        {/* This grid stacks on mobile/tablet and becomes multi-column on large desktops */}
        <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-7">
          <div className="xl:col-span-4 space-y-6">
            {isManagerOrAdmin && performance_breakdowns && (
              <PerformanceCharts breakdowns={performance_breakdowns} />
            )}
            <RecentActivity activity={recent_activity} />
          </div>
          <div className="xl:col-span-3 space-y-6">
            <ThresholdProgress />
            {actionable_insights && <ActionableInsights insights={actionable_insights} />}
            {isManagerOrAdmin && top_performers && (
              <TopPerformers performers={top_performers} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}