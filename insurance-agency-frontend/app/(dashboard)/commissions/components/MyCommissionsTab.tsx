// app/(dashboard)/commissions/components/MyCommissionsTab.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStaffCommissions, StaffCommissionFilterParams } from '@/services/commissionService';
import { StaffCommission, StaffCommissionStatus } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaginationState, SortingState } from '@tanstack/react-table';

const getStatusBadgeVariant = (status?: StaffCommissionStatus) => {
  if (!status) return 'outline';
  if (status === 'APPROVED') return 'default';
  if (status === 'PENDING_APPROVAL') return 'secondary';
  return 'outline';
};

const columns: ColumnDef<StaffCommission>[] = [
  { accessorKey: "policy_number", header: "Policy #" },
  { header: "Agent", accessorKey: "agent_email" },
  {
    header: "Amount (KES)",
    accessorKey: "commission_amount",
    cell: ({ row }) => `KES ${Number(row.original.commission_amount).toLocaleString()}`
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      const statusLabel = row.original.status?.replace(/_/g, ' ') || 'N/A';
      return <Badge variant={getStatusBadgeVariant(row.original.status)}>{statusLabel}</Badge>
    }
  },
  {
    header: "Type",
    accessorKey: "commission_type",
    cell: ({ row }) => row.original.commission_type.label
  },
  {
    header: "Date Earned",
    accessorKey: "created_at",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
  },
];

interface MyCommissionsTabProps {
  agentId?: string;
  title?: string;
  description?: string;
}

export function MyCommissionsTab({ agentId, title, description }: MyCommissionsTabProps) {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryParams: StaffCommissionFilterParams = {
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
    agent: agentId,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['staffCommissions', queryParams],
    queryFn: () => getStaffCommissions(queryParams).then(res => res.data),
  });

  const pageCount = data?.count ? Math.ceil(data.count / pageSize) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Commission Records"}</CardTitle>
        <CardDescription>{description || "A historical list of all generated commission records."}</CardDescription>
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