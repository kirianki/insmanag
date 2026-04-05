// app/(dashboard)/commissions/components/PayoutBatchesTab.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPayoutBatches, createPayoutBatch, PayoutBatchFilterParams } from '@/services/commissionService';
import { PayoutBatch } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks';
import { PaginationState, SortingState } from '@tanstack/react-table';

const columns: ColumnDef<PayoutBatch>[] = [
    { header: "Batch ID", cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.substring(0, 8)}</span> },
    { header: "Status", cell: ({ row }) => row.original.status.label },
    { header: "Initiated By", accessorKey: "initiated_by_email" },
    { header: "Total (KES)", cell: ({ row }) => `KES ${Number(row.original.total_amount).toLocaleString()}` },
    { header: "Commissions", accessorKey: "commission_count" },
    { header: "Date Created", cell: ({ row }) => new Date(row.original.created_at).toLocaleString() },
];

export function PayoutBatchesTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    const queryParams: PayoutBatchFilterParams = {
        page: pageIndex + 1,
        page_size: pageSize,
        ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
    };

    const { data, isLoading } = useQuery({
        queryKey: ['payoutBatches', queryParams],
        queryFn: () => getPayoutBatches(queryParams).then(res => res.data)
    });

    const mutation = useMutation({
        mutationFn: createPayoutBatch,
        onSuccess: () => {
            toast.success("Payout Batch Initiated", { description: "Processing approved commissions for payout." });
            queryClient.invalidateQueries({ queryKey: ['payoutBatches'] });
            queryClient.invalidateQueries({ queryKey: ['staffCommissions'] });
        },
        onError: (err: unknown) => {
            if (err instanceof Error) {
                toast.error("Failed to Initiate Batch", { description: err.message });
            } else {
                toast.error("Failed to Initiate Batch", { description: "An unexpected error occurred." });
            }
        }
    });

    const pageCount = data?.count ? Math.ceil(data.count / pageSize) : 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Payout Batches</CardTitle>
                        <CardDescription>View historical and ongoing commission payout batches.</CardDescription>
                    </div>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? "Initiating..." : "Initiate New Payout Batch"}
                    </Button>
                </div>
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