'use client';

import { useQuery } from '@tanstack/react-query';
import { getPolicies, PolicyFilterParams } from '@/services/policyService';
import { PolicyStatus, PolicyList } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreatePolicyForm } from '@/app/(dashboard)/policies/components/create-policy-form';

const getStatusBadgeVariant = (status?: PolicyStatus): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' => {
  if (!status) return 'outline';
  switch (status) {
    case 'ACTIVE':
    case 'ACTIVE_INSTALLMENT':
    case 'ACTIVE_RECURRING':
      return 'default';
    case 'AWAITING_PAYMENT':
    case 'PARTIALLY_PAID':
    case 'PAID_PENDING_ACTIVATION':
      return 'secondary';
    case 'AT_RISK_MISSING_PAYMENT':
      return 'warning';
    case 'EXPIRED':
    case 'CANCELLED':
    case 'LAPSED':
      return 'destructive';
    default:
      return 'outline';
  }
};

// --- MODIFIED: The data from getPolicies is PolicyList[], not Policy[] ---
const policyColumns: ColumnDef<PolicyList>[] = [
  {
    accessorKey: "policy_number",
    header: "Policy #",
    cell: ({ row }) => (
      <Button variant="link" asChild className="p-0 font-medium h-auto">
        <Link href={`/policies/${row.original.id}`}>
          {row.original.policy_number}
        </Link>
      </Button>
    )
  },
  {
    accessorKey: "provider_name", // It's better to show provider than vehicle reg here
    header: "Provider",
    cell: ({ row }) => row.original.provider_name || 'N/A'
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const { status, status_display } = row.original;
      return status ? <Badge variant={getStatusBadgeVariant(status)}>{status_display}</Badge> : 'N/A';
    }
  },
  {
    // --- THIS IS THE FIX ---
    accessorKey: "premium_amount",
    header: "Premium (KES)",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('premium_amount'));
      return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    }
  },
  {
    accessorKey: "policy_end_date",
    header: "Expires On",
    cell: ({ row }) => new Date(row.original.policy_end_date).toLocaleDateString()
  },
];

export function CustomerPoliciesTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [isCreateOpen, setCreateOpen] = useState(false);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const pagination = { pageIndex, pageSize };

  const queryParams: PolicyFilterParams = {
    customer: customerId,
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
  };

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['customerPolicies', customerId, pagination, sorting],
    // The result from getPolicies is a PaginatedPolicyList
    queryFn: () => getPolicies(queryParams).then(res => res.data),
    enabled: !!customerId,
    placeholderData: (previousData) => previousData,
  });

  const pageCount = policiesData?.count ? Math.ceil(policiesData.count / pageSize) : 0;

  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
            <DialogDescription>
              Fill in the details for the new insurance policy for this customer.
            </DialogDescription>
          </DialogHeader>
          <CreatePolicyForm
            initialCustomerId={customerId}
            onSuccess={(newPolicy) => {
              setCreateOpen(false);
              router.push(`/policies/${newPolicy.id}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>Add New Policy</Button>
        </div>

        <DataTable
          columns={policyColumns}
          // The results from the API are of type PolicyList[]
          data={policiesData?.results || []}
          isLoading={isLoading}
          pageCount={pageCount}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
        />
      </div>
    </>
  );
}