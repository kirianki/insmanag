// app/(dashboard)/claims/[claimId]/components/claim-details-client.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getClaimById } from '@/services/claimService';

import { ClaimHeader } from './claim-header';
import { ClaimInfoCard } from './claim-infor-card';
import { ClaimDocumentsSection } from './claim-documents-section';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';

interface ClaimDetailsClientProps {
  claimId: string;
}

interface QueryError {
  response?: {
    status?: number;
  };
}

export function ClaimDetailsClient({ claimId }: ClaimDetailsClientProps) {

  const { data: claimResponse, isLoading, isError, error } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => getClaimById(claimId),
    enabled: !!claimId,
    retry: (failureCount, error: unknown) => {
      const queryError = error as QueryError;
      if (queryError?.response?.status === 401 || queryError?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const claim = claimResponse?.data;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-3/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    const errorStatus = (error as QueryError)?.response?.status;
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center">
        <PageHeader title={errorStatus === 404 ? "Claim Not Found" : "Error"} />
        <p className="text-destructive">Could not load claim details. Please try again.</p>
      </div>
    );
  }

  if (!claim) {
    return notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <ClaimHeader claim={claim} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ClaimInfoCard title="Claim Summary" claim={claim} />
        <ClaimInfoCard title="Policy Information" claim={claim} />
        <ClaimDocumentsSection claimId={claim.id} />
      </div>
    </div>
  );
}