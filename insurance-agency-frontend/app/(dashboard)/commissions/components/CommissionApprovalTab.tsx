// app/(dashboard)/commissions/components/CommissionApprovalTab.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaffCommissions, approveStaffCommission, StaffCommissionFilterParams } from '@/services/commissionService';
import { StaffCommission } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { CheckCircle } from 'lucide-react';

export function CommissionApprovalTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryParams: StaffCommissionFilterParams = {
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
    status: 'PENDING_APPROVAL', // Specifically fetch pending commissions
  };

  const { data, isLoading } = useQuery({
    queryKey: ['staffCommissions', 'pending', queryParams],
    queryFn: () => getStaffCommissions(queryParams).then(res => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: (commissionId: string) => approveStaffCommission(commissionId),
    onSuccess: () => {
      toast.success("Commission Approved");
      queryClient.invalidateQueries({ queryKey: ['staffCommissions'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        toast.error("Approval Failed", { description: err.message });
      } else {
        toast.error("Approval Failed", { description: "An unexpected error occurred." });
      }
    },
  });

  const columns: ColumnDef<StaffCommission>[] = [
    { accessorKey: "policy_number", header: "Policy #" },
    { header: "Agent", accessorKey: "agent_email" },
    { 
      header: "Amount (KES)", 
      accessorKey: "commission_amount",
      cell: ({ row }) => `KES ${Number(row.original.commission_amount).toLocaleString()}`
    },
    { 
        header: "Date Earned",
        accessorKey: "created_at",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => approveMutation.mutate(row.original.id)}
          disabled={approveMutation.isPending && approveMutation.variables === row.original.id}
        >
          <CheckCircle className="mr-2 h-4 w-4" /> Approve
        </Button>
      ),
    },
  ];

  const pageCount = data?.count ? Math.ceil(data.count / pageSize) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Approval Queue</CardTitle>
        <CardDescription>Review and approve commissions that are pending approval.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={data?.results || []} 
          isLoading={isLoading}
          pageCount={pageCount}
          pagination={{ pageIndex, pageSize }}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
        />
      </CardContent>
    </Card>
  );
}