'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { SortingState, PaginationState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { getCustomers, CustomerFilterParams } from '@/services/customerService';
import type { Customer } from '@/types/api';
import { columns } from './components/columns';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreateCustomerForm } from './components/CreateCustomerForm';
import { CustomersToolbar } from './components/customer-toolbar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/shared/DataTablePagination'; // Import the new component

// A new component for the mobile view
const MobileCustomerCard = ({ customer }: { customer: Customer }) => {
  const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

  // Re-use the badge logic from columns.tsx
  const kycStatus = customer.kyc_status;
  const kycValue = typeof kycStatus === 'object' && kycStatus !== null ? kycStatus.value : kycStatus as string;
  const kycLabel = typeof kycStatus === 'object' && kycStatus !== null ? kycStatus.label : kycStatus as string;
  const getKycBadgeVariant = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'default';
      case 'PENDING': return 'secondary';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };

  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => router.push(`/customers/${customer.id}`)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{fullName}</CardTitle>
        {/* Actions removed for mobile view to match desktop table */}
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p><strong>ID:</strong> {customer.customer_number}</p>
        <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
        <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
      </CardContent>
      <CardFooter>
        <Badge variant={getKycBadgeVariant(kycValue)}>{kycLabel}</Badge>
      </CardFooter>
    </Card>
  );
};

export default function CustomersPage() {
  const router = useRouter();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const queryParams = useMemo((): CustomerFilterParams => ({
    page: pagination.pageIndex + 1,
    page_size: pagination.pageSize,
    search: debouncedSearchTerm || undefined,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
    kyc_status: statusFilter === 'all' ? undefined : (statusFilter as 'PENDING' | 'VERIFIED' | 'REJECTED'),
  }), [pagination, debouncedSearchTerm, statusFilter, sorting]);

  const { data: customersData, isLoading, isError, error } = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: () => getCustomers(queryParams).then((res) => res.data),
    placeholderData: (previousData) => previousData,
  });

  const customers = customersData?.results || [];
  const pageCount = customersData?.count ? Math.ceil(customersData.count / pagination.pageSize) : 0;

  if (isError) {
    return <div className="p-8 text-center text-destructive">Error loading customers: {error.message}</div>
  }

  const paginationProps = {
    pageCount,
    pagination,
    setPagination,
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <PageHeader title="Customers" />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>Fill in the details below to add a new customer.</DialogDescription>
          </DialogHeader>
          <CreateCustomerForm onSuccess={() => setCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4 space-y-4">
          <CustomersToolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onCreateClick={() => setCreateDialogOpen(true)}
          />

          {/* CHANGE: Conditional rendering for Table vs. Card view */}
          <div className="hidden md:block"> {/* Show DataTable on medium screens and up */}
            <DataTable
              columns={columns}
              data={customers}
              isLoading={isLoading}
              pageCount={pageCount}
              pagination={pagination}
              setPagination={setPagination}
              sorting={sorting}
              setSorting={setSorting}
              onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
            />
          </div>

          <div className="block md:hidden"> {/* Show Card view on screens smaller than medium */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {customers.map((customer) => (
                  <MobileCustomerCard key={customer.id} customer={customer} />
                ))}
              </div>
            )}
            {/* Add pagination controls for the mobile view */}
            <div className="mt-4">
              <DataTablePagination {...paginationProps} />
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}