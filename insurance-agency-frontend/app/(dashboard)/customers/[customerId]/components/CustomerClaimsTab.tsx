// app/(dashboard)/customers/[customerId]/components/CustomerClaimsTab.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClaims, ClaimFilterParams } from '@/services/claimService';
import { Claim, ClaimStatus } from '@/types/api';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getStatusBadgeVariant = (status?: ClaimStatus): BadgeVariant => {
  if (!status) return 'outline';
  if (['APPROVED', 'SETTLED'].includes(status)) return 'default';
  if (['FNOL', 'UNDER_REVIEW', 'AWAITING_DOCS'].includes(status)) return 'secondary';
  return 'destructive';
};

const claimColumns: ColumnDef<Claim>[] = [
  { 
    accessorKey: "claim_number", 
    header: "Claim #",
    cell: ({ row }) => (
      <Button variant="link" asChild className="p-0 font-medium h-auto">
          <Link href={`/claims/${row.original.id}`}>
              {row.original.claim_number}
          </Link>
      </Button>
    )
  },
  { accessorKey: "policy_number", header: "Policy #" },
  { 
    accessorKey: "date_of_loss", 
    header: "Date of Loss",
    cell: ({ row }) => format(new Date(row.original.date_of_loss), "PP")
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const value = typeof status === 'object' ? status.value : status;
      const label = typeof status === 'object' ? status.label : row.original.status_display;
      return <Badge variant={getStatusBadgeVariant(value)}>{label}</Badge>
    }
  },
  { 
    accessorKey: "settled_amount", 
    header: "Settled (KES)",
    cell: ({ row }) => row.original.settled_amount ? `KES ${Number(row.original.settled_amount).toLocaleString()}` : 'N/A'
  },
];


export function CustomerClaimsTab({ customerId }: { customerId: string }) {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ========== FIX IS HERE ==========
  // Use `claimant` as the key, passing the customerId
  const queryParams: ClaimFilterParams = {
    claimant: customerId,
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
  };

  const { data: claimsData, isLoading } = useQuery({
    queryKey: ['customerClaims', customerId, queryParams],
    queryFn: () => getClaims(queryParams).then(res => res.data),
    enabled: !!customerId,
    placeholderData: (previousData) => previousData,
  });

  const pageCount = claimsData?.count ? Math.ceil(claimsData.count / pageSize) : 0;

  return (
    <DataTable
      columns={claimColumns}
      data={claimsData?.results || []}
      isLoading={isLoading}
      pageCount={pageCount}
      pagination={{ pageIndex, pageSize }}
      setPagination={setPagination}
      sorting={sorting}
      setSorting={setSorting}
    />
  );
}