'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { SortingState, PaginationState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { getPolicies, PolicyFilterParams, getPolicyStatistics } from '@/services/policyService';
import { PolicyList, PolicyStatus } from '@/types/api';

import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PoliciesToolbar } from './policies-toolbar';
import { CreatePolicyForm } from './create-policy-form';
import { columns } from './columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';


function PoliciesClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setCreateOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [providerFilter, setProviderFilter] = useState(searchParams.get('provider') || 'all');
  const [policyTypeFilter, setPolicyTypeFilter] = useState(searchParams.get('policy_type') || 'all');
  const [installmentFilter, setInstallmentFilter] = useState('all');
  const [hasVehicleReg, setHasVehicleReg] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const queryParams = useMemo((): PolicyFilterParams => {
    const params: PolicyFilterParams = {
      page: pageIndex + 1,
      page_size: pageSize,
      search: debouncedSearchTerm || undefined,
      ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || '-created_at',
    };

    if (statusFilter !== 'all') params.status = statusFilter as PolicyStatus;
    if (providerFilter !== 'all') params.provider = providerFilter;
    if (policyTypeFilter !== 'all') params.policy_type = policyTypeFilter;
    if (installmentFilter !== 'all') params.is_installment = installmentFilter === 'installment';
    if (hasVehicleReg) params.has_vehicle_registration = true;
    if (dateRange?.from) params.start_date = format(dateRange.from, 'yyyy-MM-dd');
    if (dateRange?.to) params.end_date = format(dateRange.to, 'yyyy-MM-dd');

    return params;
  }, [pageIndex, pageSize, debouncedSearchTerm, statusFilter, providerFilter, policyTypeFilter, installmentFilter, hasVehicleReg, dateRange, sorting]);

  React.useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true);
  }, [searchParams]);

  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ['policies', queryParams],
    queryFn: () => getPolicies(queryParams),
  });

  const { data: statisticsData, isLoading: statsLoading } = useQuery({
    queryKey: ['policy-statistics'],
    queryFn: () => getPolicyStatistics(),
  });

  const policies = useMemo(() => (policiesData?.data?.results || []) as PolicyList[], [policiesData]);
  const pageCount = policiesData?.data?.count ? Math.ceil(policiesData.data.count / pageSize) : 0;
  const statistics = statisticsData?.data;
  const prefillCustomerId = searchParams.get('customerId') || undefined;

  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (<Card key={i}> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-20" /></CardHeader> <CardContent><Skeleton className="h-7 w-16 mt-1" /></CardContent> </Card>))}
    </div>
  );

  return (
    <>
      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Policy</DialogTitle><DialogDescription>Fill in the details for the new insurance policy.</DialogDescription></DialogHeader>
          <CreatePolicyForm
            initialCustomerId={prefillCustomerId}
            onSuccess={(newPolicy) => { setCreateOpen(false); router.push(`/policies/${newPolicy.id}`); }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        {statsLoading ? (<StatsSkeleton />) : statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Policies</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statistics.total_policies || 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Policies</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statistics.active_policies || 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Activation</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{statistics.pending_activation || 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Premium</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('en-KE').format(parseFloat(statistics.total_premium_value || '0'))}</div></CardContent></Card>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Policies</span>
              <Badge variant="outline" className="ml-2">{policiesData?.data?.count || 0} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PoliciesToolbar
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                providerFilter={providerFilter} setProviderFilter={setProviderFilter}
                policyTypeFilter={policyTypeFilter} setPolicyTypeFilter={setPolicyTypeFilter}
                installmentFilter={installmentFilter} setInstallmentFilter={setInstallmentFilter}
                hasVehicleReg={hasVehicleReg} setHasVehicleReg={setHasVehicleReg}
                dateRange={dateRange} setDateRange={setDateRange}
                onCreateClick={() => setCreateOpen(true)}
              />
              <DataTable
                columns={columns}
                data={policies}
                isLoading={policiesLoading}
                pageCount={pageCount}
                pagination={{ pageIndex, pageSize }}
                setPagination={setPagination}
                sorting={sorting}
                setSorting={setSorting}
                // --- THIS IS THE FIX ---
                // The prop is now correctly named `emptyStateMessage`
                emptyStateMessage="No policies found for the selected filters."
                onRowClick={(policy) => router.push(`/policies/${policy.id}`)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function PoliciesClient() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
      <PoliciesClientContent />
    </Suspense>
  )
}