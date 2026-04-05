// app/(dashboard)/policies/[id]/edit/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPolicyById } from '@/services/policyService';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EditPolicyForm } from './components/edit-policy-form';

export default function EditPolicyPage() {
  const params = useParams();
  const policyId = params.id as string;

  const { data: policy, isLoading, isError } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => getPolicyById(policyId).then(res => res.data),
    enabled: !!policyId,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="p-8">
        <PageHeader title="Error" />
        <p className="text-destructive">Failed to load policy for editing. It may not exist.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pt-6">
      <PageHeader
        title={`Edit Policy #${policy.policy_number}`}
        subtitle="Update the details for this policy."
      />
      <div className="mt-6">
        <EditPolicyForm policy={policy} />
      </div>
    </div>
  );
}