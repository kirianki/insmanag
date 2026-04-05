// app/(dashboard)/commissions/components/CustomerPaymentsTab.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomerPayments, CustomerPaymentFilterParams } from '@/services/commissionService';
import { CustomerPayment } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaginationState, SortingState } from '@tanstack/react-table';

const columns: ColumnDef<CustomerPayment>[] = [
    { accessorKey: "policy_number", header: "Policy #" },
    { accessorKey: "customer_name", header: "Customer" },
    { 
        header: "Amount Paid (KES)", 
        accessorKey: "amount",
        cell: ({ row }) => `KES ${Number(row.original.amount).toLocaleString()}`
    },
    { accessorKey: "mpesa_reference", header: "M-Pesa Ref" },
    { 
        header: "Payment Date", 
        accessorKey: "payment_date",
        cell: ({ row }) => new Date(row.original.payment_date).toLocaleString()
    },
];

export function CustomerPaymentsTab() {
    const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    const queryParams: CustomerPaymentFilterParams = {
        page: pageIndex + 1,
        page_size: pageSize,
        ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
    };

    const { data, isLoading } = useQuery({
        queryKey: ['customerPayments', queryParams],
        queryFn: () => getCustomerPayments(queryParams).then(res => res.data),
    });

    const pageCount = data?.count ? Math.ceil(data.count / pageSize) : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Payment Log</CardTitle>
                <CardDescription>A log of all processed customer premium payments.</CardDescription>
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