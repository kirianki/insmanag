'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { SortingState, PaginationState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { getClaims, ClaimFilterParams } from '@/services/claimService';
import { ClaimStatus } from '@/types/api';
import { columns } from './components/columns';
import { ClaimsToolbar } from './components/claims-toolbar';
import { FileClaimForm } from './components/FileClaimForm';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

export default function ClaimsPage() {
  const router = useRouter();
  const [isCreateOpen, setCreateOpen] = useState(false);

  // --- Table State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // --- Query Params Construction ---
  const queryParams = useMemo((): ClaimFilterParams => {
    return {
      page: pageIndex + 1,
      page_size: pageSize,
      search: debouncedSearchTerm || undefined,
      ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
      status: statusFilter !== 'all' ? (statusFilter as ClaimStatus) : undefined,
    };
  }, [pageIndex, pageSize, debouncedSearchTerm, statusFilter, sorting]);

  // --- Data Fetching ---
  const { data: response, isLoading } = useQuery({
    queryKey: ['claims', queryParams],
    queryFn: () => getClaims(queryParams),
    placeholderData: (prev) => prev, // Keep previous data while fetching new
  });

  const claims = response?.data.results || [];
  const pageCount = response?.data.count ? Math.ceil(response.data.count / pageSize) : 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        {/* Fixed: Removed 'description' prop causing type error */}
        <PageHeader title="Claims Management" />
        
        <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> File New Claim</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>File First Notice of Loss (FNOL)</DialogTitle>
              <DialogDescription>
                Select a customer and policy to initiate a new claim.
              </DialogDescription>
            </DialogHeader>
            <FileClaimForm onSuccess={(id) => {
              setCreateOpen(false);
              router.push(`/claims/${id}`);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <ClaimsToolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          
          <DataTable 
            columns={columns} 
            data={claims} 
            isLoading={isLoading}
            pageCount={pageCount}
            pagination={{ pageIndex, pageSize }}
            setPagination={setPagination}
            sorting={sorting}
            setSorting={setSorting}
          />
        </CardContent>
      </Card>
    </div>
  );
}