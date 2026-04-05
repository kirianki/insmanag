// app/(dashboard)/policies/[id]/components/policy-details-client.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getPolicyById, getInstallmentsForPolicy } from '@/services/policyService';
import { AxiosError } from 'axios';
import { getUserRoles } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

import { PolicyHeader } from './policy-header';
import { PolicyInfoCard } from './policy-info-card';
import { InstallmentsSection } from './installments-section';
import { PolicyOverview } from './policy-overview'; // NEW: Import the main overview component
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';

interface PolicyDetailsClientProps {
  policyId: string;
}

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export function PolicyDetailsClient({ policyId }: PolicyDetailsClientProps) {
  const { user } = useAuth();
  const userRoles = getUserRoles(user);

  const { data: policy, isLoading, isError, error } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => getPolicyById(policyId).then(res => res.data),
    enabled: !!policyId,
  });

  const { data: installmentsData, isLoading: isInstallmentsLoading } = useQuery({
    queryKey: ['installments', policyId],
    queryFn: () => getInstallmentsForPolicy(policyId).then(res => res.data),
    enabled: !!policy && policy.is_installment,
  });

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-10 w-32" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6"><Skeleton className="h-96 w-full" /><Skeleton className="h-64 w-full" /></div>
          <div className="space-y-6"><Skeleton className="h-48 w-full" /></div>
        </div>
      </div>
    );
  }

  if (isError) {
    const axiosError = error as AxiosError<ErrorResponse>;
    if (axiosError?.response?.status === 404) return notFound();
    return (
       <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Error Loading Policy" />
        <div className="text-center py-8">
          <p className="text-destructive mb-4 text-lg">
             {axiosError?.response?.data?.detail || "An unexpected error occurred."}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }
  
  if (!policy) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PolicyHeader policy={policy} />
      
      {/* NEW: Updated page layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <PolicyOverview policy={policy} />
          {policy.is_installment && (
            <InstallmentsSection
              policyId={policy.id}
              installments={installmentsData?.results || []}
              isLoading={isInstallmentsLoading}
              userRoles={userRoles || []}
            />
          )}
        </div>
        
        {/* Sidebar with related info cards */}
        <div className="space-y-6">
          <PolicyInfoCard title="Customer Details" customer={policy.customer_detail} />
          <PolicyInfoCard title="Insurance Provider" provider={policy.provider_detail} />
          <PolicyInfoCard title="Assigned Agent" agent={policy.agent_detail} />
        </div>
      </div>
    </div>
  );
}