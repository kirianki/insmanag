'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { AlertTriangle, FileText, ShieldCheck } from 'lucide-react';

// --- Local Project Imports ---
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/use-auth';
import { User, AgencyBranch, DashboardData } from '../../../types';
import { DashboardFilters } from '../../../components/features/dashboard/dashboard-filters';
import { KPIsGrid } from '../../../components/features/dashboard/kpis-grid';
import { RecentActivityCard } from '../../../components/features/dashboard/recent-activity-card';
import { ExpiringPoliciesCard } from '../../../components/features/dashboard/expiring-policies-card';
import { PerformanceBreakdownCard } from '../../../components/features/dashboard/performance-breakdown-card';
import { TopPerformersCard } from '../../../components/features/dashboard/top-performers-card';
import { Badge } from '../../../components/ui/badge';


// --- API Data Fetching Functions ---

interface DashboardFiltersState {
  agentId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const fetchDashboardData = async (filters: DashboardFiltersState): Promise<DashboardData> => {
  const params = new URLSearchParams();
  if (filters.agentId && filters.agentId !== 'all') params.append('agent_id', filters.agentId);
  if (filters.branchId && filters.branchId !== 'all') params.append('branch_id', filters.branchId);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  
  const { data } = await api.get(`/analytics/dashboard/?${params.toString()}`);
  return data;
};

const fetchAgents = async (agencyId?: string): Promise<User[]> => {
  const params = agencyId ? `?agency_id=${agencyId}&role=Agent` : '?role=Agent';
  const { data } = await api.get<{ results: User[] }>(`/accounts/users/${params}`);
  return data.results;
};

const fetchBranches = async (agencyId: string): Promise<AgencyBranch[]> => {
  const url = `/accounts/agencies/${agencyId}/branches/`;
  const { data } = await api.get<{ results: AgencyBranch[] }>(url);
  return data.results;
};


// --- UI State Components ---

const DashboardLoading = () => (
  <div className="flex flex-col justify-center items-center h-64 space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
  </div>
);

const DashboardError = ({ message }: { message: string }) => (
  <div className="max-w-md mx-auto text-center p-6 rounded-lg border border-destructive/50 bg-destructive/5">
    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
    <h3 className="font-semibold text-lg mb-1">Unable to Load Dashboard</h3>
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const DashboardNoData = () => (
  <div className="max-w-md mx-auto text-center p-8 rounded-lg border-2 border-dashed">
    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
    <h3 className="font-semibold mb-1">No Data Available</h3>
    <p className="text-sm text-muted-foreground">Try adjusting your filters or date range.</p>
  </div>
);


// --- Main Page Component ---

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  const isManagerOrAdmin = user?.roles?.some(r => ['Branch Manager', 'Agency Admin'].includes(r)) ?? false;
  const isAgencyAdmin = user?.roles?.includes('Agency Admin') ?? false;
  const agencyId = user?.agency_detail?.id;

  // --- Data Fetching with react-query ---

  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['dashboard', selectedAgentId, selectedBranchId, dateRange, user?.id],
    queryFn: () => fetchDashboardData({
      agentId: selectedAgentId,
      branchId: selectedBranchId,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    }),
    enabled: !isAuthLoading && !!user,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents', agencyId],
    queryFn: () => fetchAgents(agencyId),
    enabled: !!isManagerOrAdmin && !!agencyId,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', agencyId],
    queryFn: () => fetchBranches(agencyId!),
    enabled: !!isAgencyAdmin && !!agencyId,
  });

  // --- Render Logic ---

  if (isAuthLoading || isDashboardLoading) {
    return <DashboardLoading />;
  }

  if (dashboardError) {
    return <DashboardError message={(dashboardError as Error).message} />;
  }

  if (!dashboardData) {
    return <DashboardNoData />;
  }
  
  const performanceData = {
    byPolicyType: dashboardData.performance_breakdowns?.by_policy_type?.map(item => ({ 
      name: (item as any).policy_type__name, 
      total_premium: item.total_premium,
      policies_count: item.policies_count
    })) ?? [],
    byProvider: dashboardData.performance_breakdowns?.by_provider?.map(item => ({ 
      name: (item as any).provider__name, 
      total_premium: item.total_premium,
      policies_count: item.policies_count
    })) ?? [],
    byBranch: dashboardData.performance_breakdowns?.by_branch?.map(item => ({ 
      name: (item as any).branch__branch_name, 
      total_premium: item.total_premium,
      policies_count: item.policies_count
    })) ?? [],
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {isAgencyAdmin ? 'Administration Dashboard' : 'Dashboard'}
              </h1>
              {isAgencyAdmin && (
                <Badge variant="destructive" className="h-6">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {dashboardData.scope.name}
            </p>
          </div>
          {isManagerOrAdmin && (
            <DashboardFilters
              dateRange={dateRange}
              onDateChange={setDateRange}
              agents={agents}
              selectedAgent={selectedAgentId}
              onAgentChange={setSelectedAgentId}
              branches={branches}
              selectedBranch={selectedBranchId}
              onBranchChange={setSelectedBranchId}
              enableBranchFilter={isAgencyAdmin}
            />
          )}
        </div>
      </header>

      <main className="space-y-8">
        <KPIsGrid kpis={dashboardData.kpis} />
        
        <div className="grid gap-6 lg:grid-cols-2">
          {isManagerOrAdmin && dashboardData.top_performers && (
            <TopPerformersCard agents={dashboardData.top_performers.agents_by_premium} />
          )}
          <ExpiringPoliciesCard policies={dashboardData.actionable_insights.expiring_policies_in_30_days} />
        </div>

        {isManagerOrAdmin && (
          <PerformanceBreakdownCard data={performanceData} isAgencyAdmin={isAgencyAdmin} />
        )}
        
        <RecentActivityCard
          policies={dashboardData.recent_activity.policies_sold}
          claims={dashboardData.recent_activity.claims_filed}
        />
      </main>
    </div>
  );
}